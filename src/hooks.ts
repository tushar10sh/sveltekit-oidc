import cookie from 'cookie';
import type { Handle, GetSession } from '@sveltejs/kit';
import { 
	initiateBackChannelOIDCAuth,
	initiateBackChannelOIDCLogout,
	isTokenExpired,
	renewOIDCToken,
	introspectOIDCToken,
	populateRequestLocals,
	populateResponseHeaders,
	injectCookies,
	parseUser
} from '$lib/keycloak/utils';

import type { OIDCResponse } from '$lib/types';

const oidcBaseUrl = `${import.meta.env.VITE_OIDC_ISSUER}/protocol/openid-connect`;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
const clientSecret = import.meta.env.VITE_OIDC_CLIENT_SECRET;
let appRedirectUrl = import.meta.env.VITE_OIDC_REDIRECT_URI;


const isAuthInfoInvalid = (obj) => {
	return (!obj?.userid || !obj?.access_token || !obj?.refresh_token || !obj?.user );
}

export const handle: Handle = async ({ request, resolve }) => {

	console.log('Request path:', request.path);
	const cookies = cookie.parse(request.headers.cookie || '');
	const userInfo = cookies?.userInfo ? JSON.parse(cookies.userInfo) : {};
    request.locals.retries = 0;
	request.locals.authError = {
		error: null,
		error_description: null
	};

	populateRequestLocals(request, 'userid', userInfo, '');
	populateRequestLocals(request, 'access_token', userInfo, null);
	populateRequestLocals(request, 'refresh_token', userInfo, null);

	let ssr_redirect = false;
	let ssr_redirect_uri = '/';

	// Handling user logout
	if ( request.query.get('event') === 'logout' ) {
		await initiateBackChannelOIDCLogout(request.locals.access_token, clientId, clientSecret, oidcBaseUrl, request.locals.refresh_token);
		request.locals.access_token = null;
		request.locals.refresh_token = null;
		request.locals.authError  = {
			error: 'invalid_session',
			error_description: 'Session is no longer active'
		};
		request.locals.user = null;
		ssr_redirect_uri = request.path;
		let response =  {
			status: 302,
			headers: {
				'Location': ssr_redirect_uri
			}
		}
		try {
			response = populateResponseHeaders(request, response);
			response = injectCookies(request, response);
		} catch(e) {}
		return response;
	}


	// Parsing user object
	const userJsonParseFailed = parseUser(request, userInfo);
		
	// Backchannel Authorization code flow
	if ( request.query.get('code') && (!isAuthInfoInvalid(request.locals) || isTokenExpired(request.locals.access_token)) ) {
		const jwts: OIDCResponse = await initiateBackChannelOIDCAuth(request.query.get('code'), clientId, clientSecret, oidcBaseUrl, appRedirectUrl + request.path);
		if ( jwts.error ) {
			request.locals.authError = {
				error: jwts.error,
				error_description: jwts.error_description
			}
		} else {
			request.locals.access_token = jwts?.access_token;
			request.locals.refresh_token = jwts?.refresh_token;
		}
		ssr_redirect = true;
		ssr_redirect_uri = request.path;
	}
	
	if (request.query.has('_method')) {
		request.method = request.query.get('_method').toUpperCase();
	}
	
	const tokenExpired = isTokenExpired(request.locals.access_token);
	const beforeAccessToken = request.locals.access_token;
	let response = await resolve(request);
	const afterAccessToken = request.locals.access_token;

	if ( ( isAuthInfoInvalid(request.headers) || tokenExpired) ) {
		response = populateResponseHeaders(request, response);
	}
	if ( ( isAuthInfoInvalid(userInfo) || (request.locals?.user && userJsonParseFailed ) || tokenExpired || (beforeAccessToken!==afterAccessToken)) ) {
		// if this is the first time the user has visited this app,
		// set a cookie so that we recognise them when they return
		response = injectCookies(request, response);
	}
	if ( ssr_redirect ) {
		response.status = 302;
		response.headers['Location'] = ssr_redirect_uri;
	} 
	return response;
};


/** @type {import('@sveltejs/kit').GetSession} */
export const getSession: GetSession = async (request) => {
	try {
		if ( request.locals?.access_token ) {
			if ( request.locals.user && request.locals.userid && !isTokenExpired(request.locals.access_token) ) {
				let isTokenActive = true;
				try {
					const tokenIntrospect = await introspectOIDCToken(request.locals.access_token, oidcBaseUrl, clientId, clientSecret, request.locals.user.preferred_username )
					isTokenActive = Object.keys(tokenIntrospect).includes('active') ? tokenIntrospect.active : false;
					console.log('token active ', isTokenActive);
				} catch(e) {
					isTokenActive = false;
					console.error('Error while fetching introspect details', e);
				}
				if ( isTokenActive ) {
					return {
						user: {...request.locals.user },
						access_token: request.locals.access_token,
						refresh_token: request.locals.refresh_token,
						userid: request.locals.user.sub,
						auth_server_online: true
					}
				}
			}
			try {
				const testAuthServerResponse = await fetch(import.meta.env.VITE_OIDC_ISSUER,{
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if ( !testAuthServerResponse.ok ) {
					throw {
						error: await testAuthServerResponse.json()
					}
				}
			} catch (e) {
				throw {
					error: 'auth_server_conn_error',
					error_description: 'Auth Server Connection Error'
				}
			}
			const res = await fetch(`${oidcBaseUrl}/userinfo`, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${request.locals.access_token}`
				}
			});
			if ( res.ok ) {
				const data = await res.json();
                console.log('userinfo fetched');
				request.locals.userid = data.sub;
				request.locals.user = {...data};
				return {
					user: {
						// only include properties needed client-side —
						// exclude anything else attached to the user
						// like access tokens etc
						...data
					}, 
					access_token: request.locals.access_token,
					refresh_token: request.locals.refresh_token,
					userid: data.sub,
					auth_server_online: true
				}
			} else {
				try {
                	const data = await res.json();
					console.log(data, import.meta.env.VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES);
					if ( data?.error && request.locals?.retries < import.meta.env.VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES) {
						console.log('old token expiry', isTokenExpired(request.locals.access_token));
						const newTokenData = await renewOIDCToken(request.locals.refresh_token, oidcBaseUrl, clientId, clientSecret);
						// console.log(newTokenData);
						if ( newTokenData?.error ) {
							throw {
								error: data?.error ? data.error : 'user_info error',
								error_description: data?.error_description ? data.error_description :"Unable to retrieve user Info"
							}
						} else {
							request.locals.access_token = newTokenData.access_token;
							request.locals.retries = request.locals.retries + 1;
							return getSession(request);
						}
					}
					
					throw {
						error: data?.error ? data.error : 'user_info error',
						error_description: data?.error_description ? data.error_description :"Unable to retrieve user Info"
					}
				} catch (e) {
					console.error(e);
					throw {
						...e
					}
				}
                
                
            }
		} else {
			console.error('getSession request.locals.access_token ', request.locals.access_token);
			try {
				const testAuthServerResponse = await fetch(import.meta.env.VITE_OIDC_ISSUER,{
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if ( !testAuthServerResponse.ok ) {
					throw {
						error: await testAuthServerResponse.json()
					}
				}
			} catch (e) {
				throw {
					error: 'auth_server_conn_error',
					error_description: 'Auth Server Connection Error'
				}
			}
			throw {
				error: 'missing_jwt',
				error_description: 'access token not found or is null'
			}
		}
	} catch (err) {
		request.locals.access_token = '';
		request.locals.refresh_token = '';
		request.locals.userid = '';
		request.locals.user = null;
		if ( err?.error ) {
			request.locals.authError.error = err.error;
		}
		if ( err?.error_description ) {
			request.locals.authError.error_description = err.error_description;
		}
		return {
			user: null,
			access_token: null,
			refresh_token: null,
			userid: null,
            error: (request.locals.authError?.error ? request.locals.authError : null),
			auth_server_online: err.error !== 'auth_server_conn_error' ? true : false
		}
	}
}