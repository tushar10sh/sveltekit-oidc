import type { LoadOutput } from '@sveltejs/kit';
import type { Locals, OIDCFailureResponse, OIDCResponse } from '$lib/types';

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
        console.log('Logout Request sucess');
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
            refresh_token: refresh_token
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


export const populateRequestLocals = (request, keyName, userInfo, defaultValue) => {
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

export const populateResponseHeaders = (request, response) => {
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

export const injectCookies = (request, response) => {
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
	responseCookies['access_token'] = `${request.locals.access_token}`;
	responseCookies['refresh_token'] = `${request.locals.refresh_token}`;
	response.headers['set-cookie'] = `userInfo=${JSON.stringify(responseCookies)}; Path=/; HttpOnly;`
	return response;
}

export const parseUser = (request, userInfo) => {
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