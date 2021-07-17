import type { LoadOutput } from '@sveltejs/kit';
import type { Locals, OIDCResponse } from '$lib/types';

export function isTokenExpired(jwt: string): boolean {
    if ( !jwt || jwt.length < 10 ) {
        return true;
    }
    const tokenTimeSkew =10;  // 10 seconds before actual token exp
    const data = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
	return ( new Date().getTime()/1000 > (data.exp - tokenTimeSkew) ) ;
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


export async function renewOIDCToken(refresh_token: string, oidcBaseUrl: string, clientId: string, clientSecret: string): Promise<OIDCResponse>  {
    let formBody = [
        'refresh_token=' + refresh_token,
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'grant_type=refresh_token',
    ];

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