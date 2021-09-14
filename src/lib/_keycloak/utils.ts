import type { LoadOutput } from '@sveltejs/kit';
import type { Locals, OIDCFailureResponse, OIDCResponse, UserDetailsGeneratorFn, GetUserSessionFn} from '../types';
import { parseCookie } from './cookie';
import type { ServerRequest, ServerResponse } from '@sveltejs/kit/types/hooks';

export const oidcBaseUrl = `${import.meta.env.VITE_OIDC_ISSUER}/protocol/openid-connect`;
export const clientId = `${import.meta.env.VITE_OIDC_CLIENT_ID}`;
let appRedirectUrl = import.meta.env.VITE_OIDC_REDIRECT_URI;

export function isTokenExpired(jwt: string): boolean {
    let data = null;
    if ( !jwt || jwt.length < 10 ) {
        return true;
    }
    const tokenTimeSkew =10;  // 10 seconds before actual token exp
    try {
        data = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    } catch (e) {
        try {
            data = JSON.parse(atob(jwt.split('.')[1]).toString());
        } catch (e) {}
    }
	return data?.exp ? ( new Date().getTime()/1000 > (data.exp - tokenTimeSkew) ) : true;
}

export function initiateFrontChannelOIDCAuth(browser: boolean, oidcBaseUrl: string, clientId: string, client_scopes: string, appRedirectUrl: string, request_path?: string, request_params?: Record<string, string>): LoadOutput {
    const oidcRedirectUrlWithParams = [
        `${oidcBaseUrl}/auth?scope=${browser ? encodeURIComponent(client_scopes) : client_scopes}`,
        `client_id=${clientId}`,
        `redirect_uri=${browser ? encodeURIComponent(appRedirectUrl + (request_path ? request_path : '/') ) : (appRedirectUrl + (request_path ? request_path : '/') )}`,
        'response_type=code',
        'response_mode=query',
    ];
    return {
        redirect: oidcRedirectUrlWithParams.join('&'),
        status: 302
    }
}


export async function initiateBackChannelOIDCAuth(authCode: string, clientId: string, clientSecret: string, oidcBaseUrl: string, appRedirectUrl: string): Promise<OIDCResponse>  {
    let formBody = [
        'code=' + authCode,
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'grant_type=authorization_code',
        'redirect_uri=' + encodeURIComponent(appRedirectUrl),
    ];

    if ( !authCode ) {
        const error_data: OIDCResponse = {
            error: 'invalid_code',
            error_description: 'Invalid code',
            access_token: null,
            refresh_token: null,
            id_token: null
        }
        return error_data;
    }

    const res = await fetch(`${oidcBaseUrl}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody.join('&')
    });

    if ( res.ok ) {
        const data: OIDCResponse = await res.json();
        return data;
    } else {
        const data: OIDCResponse = await res.json();
        console.log('response not ok');
        console.log(data);
        console.log(formBody.join('&'));
        return data;
    }
}

export async function initiateBackChannelOIDCLogout(access_token: string, clientId: string, clientSecret: string, oidcBaseUrl: string, refresh_token: string): Promise<OIDCFailureResponse>  {
    let formBody = [
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'refresh_token=' + refresh_token
    ];

    if ( !access_token || !refresh_token ) {
        const error_data = {
            error: 'invalid_grant',
            error_description: 'Invalid tokens'
        }
        return error_data;
    }

    const res = await fetch(`${oidcBaseUrl}/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${access_token}`
        },
        body: formBody.join('&')
    });

    if ( res.ok ) {
        return {
            error: null,
            error_description: null
        }
    } else {
        const error_data: OIDCResponse = await res.json();
        console.log('logout response not ok');
        console.log(error_data);
        console.log(formBody.join('&'));
        return error_data;
    }
}

export async function renewOIDCToken(refresh_token: string, oidcBaseUrl: string, clientId: string, clientSecret: string): Promise<OIDCResponse>  {
    let formBody = [
        'refresh_token=' + refresh_token,
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'grant_type=refresh_token',
    ];

    if ( !refresh_token ) {
        const error_data: OIDCResponse = {
            error: 'invalid_grant',
            error_description: 'Invalid tokens',
            access_token: null,
            refresh_token: null,
            id_token: null
        }
        return error_data;
    }

    const res = await fetch(`${oidcBaseUrl}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody.join('&')
    });

    if ( res.ok ) {
        const newToken = await res.json()
        const data: OIDCResponse = {
            ...newToken,
			refresh_token: isTokenExpired(refresh_token) ? newToken.refresh_token : refresh_token
        };
        return data;
    } else {
        const data: OIDCResponse = await res.json();
        console.log('renew response not ok');
        console.log(data);
        return data;
    }
}

export async function introspectOIDCToken(access_token: string, oidcBaseUrl: string, clientId: string, clientSecret: string, username: string): Promise<any>  {
    let formBody = [
        'token=' + access_token,
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'username=' + username,
    ];

    if ( !access_token ) {
        const error_data: OIDCResponse = {
            error: 'invalid_grant',
            error_description: 'Invalid tokens',
            access_token: null,
            refresh_token: null,
            id_token: null
        }
        return error_data;
    }

    const res = await fetch(`${oidcBaseUrl}/token/introspect`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody.join('&')
    });

    if ( res.ok ) {
        const tokenIntrospect = await res.json() 
        return tokenIntrospect;
    } else {
        const data: OIDCResponse = await res.json();
        console.log('introspect response not ok');
        console.log(data);
        return data;
    }
}


export const populateRequestLocals = (request: ServerRequest<Locals>, keyName: string, userInfo, defaultValue) => {
	if ( request.headers[keyName] ) {
		request.locals[keyName] = request.headers[keyName];
	} else {
		if ( userInfo[keyName] && userInfo[keyName] !== "null" && userInfo[keyName] !== "undefined" ) {
			request.locals[keyName] = userInfo[keyName];
		} else {
			request.locals[keyName] = defaultValue;
		}
	}
	return request;
}

export const populateResponseHeaders = (request: ServerRequest<Locals>, response: ServerResponse) => {
	if ( request.locals.user ) {
		response.headers['user'] = `${JSON.stringify(request.locals.user)}`;
	}

	if ( request.locals.userid ) {
		response.headers['userid'] = `${request.locals.userid}`;
	}
	
	if ( request.locals.access_token ) {
		response.headers['access_token'] = `${request.locals.access_token}`;
	}
	if ( request.locals.refresh_token ) {
		response.headers['refresh_token'] = `${request.locals.refresh_token}`;
	}
	return response;
}

export const injectCookies = (request: ServerRequest<Locals>, response: ServerResponse) => {
	let responseCookies = {};
	let serialized_user = null;

	try{
		serialized_user = JSON.stringify(request.locals.user);
	} catch {
		request.locals.user = null;
	}
	responseCookies = {
		userid: `${request.locals.userid}`,
		user: `${serialized_user}`
	};
	responseCookies['refresh_token'] = `${request.locals.refresh_token}`;
	let cookieAtrributes = 'Path=/; HttpOnly; SameSite=Lax;';
	if ( request.locals?.cookieAttributes ) {
		cookieAtrributes = request.locals.cookieAttributes;
	}
	response.headers['set-cookie'] = `userInfo=${JSON.stringify(responseCookies)}; ${cookieAtrributes}`;
	return response;
}

export const parseUser = (request: ServerRequest<Locals>, userInfo) => {
    let userJsonParseFailed = false;
    try {
		if ( request.headers?.user ) {
			request.locals.user = JSON.parse(request.headers.user);
		} else {
			if ( userInfo?.user && userInfo?.user !== "null" && userInfo?.user !== "undefined") {
				request.locals.user = JSON.parse(userInfo.user);
				if ( !request.locals.user) {
					userJsonParseFailed = true;
				}
			} else {
				throw {
					error: 'invalid_user_object'
				}
			}
		}
	} catch {
		userJsonParseFailed = true;
		request.locals.user = null;
	}
    return userJsonParseFailed;
}

const isAuthInfoInvalid = (obj) => {
	return (!obj?.userid || !obj?.access_token || !obj?.refresh_token || !obj?.user );
}

export const userDetailsGenerator: UserDetailsGeneratorFn = async function* (request: ServerRequest<Locals>, clientSecret: string) {
    console.log('Request path:', request.path);
	const cookies = request.headers.cookie ? parseCookie(request.headers.cookie || '') : null;
	// console.log(cookies);
	const userInfo = cookies?.['userInfo'] ? JSON.parse(cookies?.['userInfo']) : {};
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
		let response: ServerResponse =  {
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
	
	const tokenExpired = isTokenExpired(request.locals.access_token);
	const beforeAccessToken = request.locals.access_token;

    request = {...request, ...yield};
	
    let response: ServerResponse = {status: 200, headers: {}};
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
} 



export const getUserSession: GetUserSessionFn = async (request: ServerRequest<Locals>, clientSecret) => {
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
                // console.log('userinfo fetched');
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
					// console.log(data, import.meta.env.VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES);
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
							return await getUserSession(request, clientSecret);
						}
					}
					
					throw {
						error: data?.error ? data.error : 'user_info error',
						error_description: data?.error_description ? data.error_description :"Unable to retrieve user Info"
					}
				} catch (e) {
					// console.error('Error while refreshing access_token; access_token is invalid', e);
					throw {
						...e
					}
				}
            }
		} else {
			// console.error('getSession request.locals.access_token ', request.locals.access_token);
			try {
				if ( request.locals?.retries < import.meta.env.VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES) {
					console.log('old token expiry', isTokenExpired(request.locals.access_token));
					const newTokenData = await renewOIDCToken(request.locals.refresh_token, oidcBaseUrl, clientId, clientSecret);
					// console.log(newTokenData);
					if ( newTokenData?.error ) {
						throw {
							error: newTokenData.error,
							error_description: newTokenData.error_description
						}
					} else {
						request.locals.access_token = newTokenData.access_token;
						request.locals.retries = request.locals.retries + 1;
						return await getUserSession(request, clientSecret);
					}
				}
				
			} catch (e) {
				console.error('Error while refreshing access_token; access_token is missing', e);
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