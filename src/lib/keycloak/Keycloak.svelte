<script context="module" lang="ts">
    import * as AuthStore from './AuthStore';
	import { initiateFrontChannelOIDCAuth } from './utils'; 
	import type { Load } from '@sveltejs/kit';
	import type { OidcContextClientFn, OidcContextClientPromise } from '$lib/types';

	export const OIDC_CONTEXT_CLIENT_PROMISE = {};
	export const OIDC_CONTEXT_REDIRECT_URI: string = ''; 
	export const OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI: string = '';

	export async function login(oidcPromise: OidcContextClientPromise) {
		try {
			const oidc_func = await oidcPromise;
			const { session, issuer, redirect, page } = oidc_func();
			console.log(session, issuer, redirect, page);
			if ( session?.auth_server_online === false ) {
				const testAuthServerResponse = await fetch(issuer,{
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if ( !testAuthServerResponse.ok ) {
					throw {
						error: await testAuthServerResponse.json()
					}
				}
			} else {
				
				AuthStore.isLoading.set(true);
				const relogin_initiate_error_list = [
					'missing_jwt',
					'invalid_grant',
					'invalid_token',
					'token_refresh_error'
				];
				const relogin_initiate = session?.error?.error ? relogin_initiate_error_list.includes(session.error.error) : false;
				if ( !session?.user && (!session?.error || relogin_initiate) ) {
					
					AuthStore.isAuthenticated.set(false);
					AuthStore.accessToken.set(null);
					AuthStore.refreshToken.set(null);
					window.location.assign(redirect);
				} else if ( session?.error )  {
					AuthStore.isAuthenticated.set(false);
					AuthStore.accessToken.set(null);
					AuthStore.refreshToken.set(null);
					AuthStore.authError.set(session.error);
					if ( session.error?.error === 'invalid_request' ) {
						window.location.assign(redirect);
					} else {
						AuthStore.isLoading.set(false);
					}
				} else {
					AuthStore.isLoading.set(false);
					AuthStore.isAuthenticated.set(true);
					AuthStore.accessToken.set(session.access_token);
					AuthStore.refreshToken.set(session.refresh_token);
					AuthStore.authError.set(null);
					if ( window.location.toString().includes('code=') ) {
						window.location.assign(page.path);
					}
				}
			}
		} catch (e) {
			console.error(e);
			AuthStore.isLoading.set(false);
			AuthStore.isAuthenticated.set(false);
			AuthStore.accessToken.set(null);
			AuthStore.refreshToken.set(null);
			AuthStore.authError.set({
				error: 'auth_server_conn_error',
				error_description: 'Auth Server Connection Error'
			});
		}
	}

	export async function logout(oidcPromise: OidcContextClientPromise, post_logout_redirect_uri: string) {
		const oidc_func = await oidcPromise;
		const { issuer, client_id } = oidc_func();
		const logout_endpoint = `${issuer}/protocol/openid-connect/logout`;
		const logout_uri = `${issuer}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(post_logout_redirect_uri + '?event=logout')}`;

		const res = await fetch(logout_endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${AuthStore.accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `client_id=${client_id}&refresh_token=${AuthStore.refreshToken}`
		});
		window.localStorage.setItem('user_logout', "true");
		if ( res.ok ) {
			window.location.assign(logout_uri);
		} else {
			window.location.assign(logout_uri);
		}
	}

</script>

<script lang="ts">
    import { setContext } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/env';
	
	import { page, session } from '$app/stores';


    // props.
	export let issuer: string;
	export let client_id: string;
	export let redirect_uri: string;
	export let post_logout_redirect_uri: string;
    export let scope:string;
	export let refresh_token_endpoint: string;
	
	const oidcBaseUrl = `${issuer}/protocol/openid-connect`;

	const oidc_func: OidcContextClientFn = (request_path?: string, request_params?: Record<string, string>) => {
		return {
			redirect: initiateFrontChannelOIDCAuth(browser, oidcBaseUrl, client_id, scope, redirect_uri, request_path, request_params).redirect,
			session: $session,
			issuer,
			page: $page,
			client_id
		}
	}
	const oidc_auth_promise: OidcContextClientPromise = Promise.resolve( oidc_func );
	setContext(OIDC_CONTEXT_CLIENT_PROMISE, oidc_auth_promise);
	setContext(OIDC_CONTEXT_REDIRECT_URI, redirect_uri);
	setContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI, post_logout_redirect_uri);

	let tokenTimeoutObj = null;
	export async function silentRefresh(oldRefreshToken: string) {
		const reqBody = `refresh_token=${oldRefreshToken}`;
		const res = await fetch(refresh_token_endpoint, {
			method: 'POST',
			headers: {
   	        	'Content-Type': 'application/x-www-form-urlencoded'
        	},
			body: reqBody
		})
		if ( res.ok ) {
			const resData = await res.json();
			if ( !resData.error ) {
				const { access_token, refresh_token } = resData;
				AuthStore.accessToken.set(access_token);
				AuthStore.refreshToken.set(refresh_token);
				const jwtData = JSON.parse(atob(access_token.split('.')[1]).toString());
				const tokenSkew = 10; // 10 seconds before actual token expiry
				const timeoutDuration =  ( jwtData.exp*1000 - tokenSkew*1000 - new Date().getTime() );
				if ( tokenTimeoutObj ) {
					clearTimeout(tokenTimeoutObj);
				}
				tokenTimeoutObj = setTimeout( async () => {
					await silentRefresh(refresh_token);
				}, timeoutDuration);
			} else {
				if ( tokenTimeoutObj ) {
					clearTimeout(tokenTimeoutObj);
				}
				AuthStore.accessToken.set(null);
				AuthStore.refreshToken.set(null);
				AuthStore.isAuthenticated.set(false);
				AuthStore.authError.set({
					error: resData.error,
					error_description: resData.error_description
				});
			}
		} else {
			AuthStore.accessToken.set(null);
			AuthStore.refreshToken.set(null);
			AuthStore.isAuthenticated.set(false);
			AuthStore.authError.set({
				error: 'token_refresh_error',
				error_description: 'Unable to Refresh token'
			});
		}
	}
	const syncLogout = (event: StorageEvent) => {
		if ( browser ) {
			if ( event.key === 'user_logout') {
				try {
					if ( JSON.parse(window.localStorage.getItem('user_logout')) ) {
						window.localStorage.setItem('user_login', null);
						window.location.assign($page.path);
					}
				} catch(e) {}
			}
		}
	}

	const syncLogin = (event: StorageEvent) => {
		if ( browser ) {
			if ( event.key === 'user_login') {
				try {
					window.localStorage.setItem('user_logout', "false");
					const userInfo = JSON.parse(window.localStorage.getItem('user_login'));
					if ( userInfo && (!$session.user || $session.user.preferred_username !== userInfo.preferred_username) ) {
						const answer = confirm(`Welcome ${userInfo.preferred_username}. Refresh page!`)
						if ( answer ) {
							window.location.assign($page.path);
						}
					}
				} catch(e) {}
			}
		}
	}

	async function handleMount() {

		try {
			window.addEventListener('storage', syncLogout);
			window.addEventListener('storage', syncLogin);
		} catch(e) {}

		try {
			if ( $session?.auth_server_online === false ) {
				const testAuthServerResponse = await fetch(issuer,{
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if ( !testAuthServerResponse.ok ) {
					throw {
						error: await testAuthServerResponse.json()
					}
				}
			} else {		
				AuthStore.isLoading.set(false);
				if ( !$session.user ) {
					AuthStore.isAuthenticated.set(false);
					AuthStore.accessToken.set(null);
					AuthStore.refreshToken.set(null);
					if ( window.location.toString().includes('event=logout') ) {
						window.location.assign($page.path);
					}
				} else {
					AuthStore.isAuthenticated.set(true);
					AuthStore.accessToken.set($session.access_token);
					AuthStore.refreshToken.set($session.refresh_token);
					const jwtData = JSON.parse(atob($session.access_token.split('.')[1]).toString());
					const tokenSkew = 10; // 10 seconds before actual token expiry
					const timeoutDuration =  ( jwtData.exp*1000 - tokenSkew*1000 - new Date().getTime() );
					tokenTimeoutObj = setTimeout( async () => {
						await silentRefresh($session.refresh_token);
					}, timeoutDuration);
					AuthStore.authError.set(null);
					if ( window.location.toString().includes('code=') ) {
						window.location.assign($page.path);
					}

					try {
						window.localStorage.setItem('user_login', JSON.stringify($session.user) )
					} catch(e) {}
				}
			}
		} catch (e) {
			console.error(e);
			AuthStore.isLoading.set(false);
			AuthStore.isAuthenticated.set(false);
			AuthStore.accessToken.set(null);
			AuthStore.refreshToken.set(null);
			AuthStore.authError.set({
				error: 'auth_server_conn_error',
				error_description: 'Auth Server Connection Error'
			});
			if ( window.location.toString().includes('event=logout') ) {
				window.location.assign($page.path);
			}
		}
	}
    onMount(handleMount);

	onDestroy( () => {
		if ( tokenTimeoutObj ) {
			clearTimeout(tokenTimeoutObj);
		}
		try {
			window.removeEventListener('storage', syncLogout);
			window.removeEventListener('storage', syncLogin);
		} catch(e) {}
	});
</script>
<slot></slot>