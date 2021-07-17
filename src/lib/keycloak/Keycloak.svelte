<script context="module" lang="ts">
    import * as AuthStore from './AuthStore';
	import { initiateFrontChannelOIDCAuth } from './utils'; 
	import type { Load } from '@sveltejs/kit';
	import type { OidcContextClientPromise } from '$lib/types';

	export const OIDC_CONTEXT_CLIENT_PROMISE = {};
	export const OIDC_CONTEXT_REDIRECT_URI: string = ''; 
	export const OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI: string = '';
	
	export async function login(oidcPromise) {
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

	export async function logout(oidcPromise, post_logout_redirect_uri) {
		const oidc_func = await oidcPromise;
		const { issuer } = oidc_func();
		const logout_uri = `${issuer}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(post_logout_redirect_uri)}`;
		window.location.assign(logout_uri);
	}
</script>

<script lang="ts">
    import { setContext } from 'svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	
	import { page, session } from '$app/stores';
    // props.
	export let issuer: string;
	export let client_id: string;
	export let redirect_uri: string;
	export let post_logout_redirect_uri: string;
    export let scope:string;
	const oidcBaseUrl = `${issuer}/protocol/openid-connect`;

	const oidc_auth_promise: OidcContextClientPromise = Promise.resolve( (request_path?: string, request_params?: Record<string, string>) => {
		return {
			redirect: initiateFrontChannelOIDCAuth(browser, oidcBaseUrl, client_id, scope, redirect_uri, request_path, request_params).redirect,
			session: $session,
			issuer,
			page: $page
		}
	});
	setContext(OIDC_CONTEXT_CLIENT_PROMISE, oidc_auth_promise);
	setContext(OIDC_CONTEXT_REDIRECT_URI, redirect_uri);
	setContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI, post_logout_redirect_uri);

	async function handleMount() {
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
				} else {
					AuthStore.isAuthenticated.set(true);
					AuthStore.accessToken.set($session.access_token);
					AuthStore.refreshToken.set($session.refresh_token);
					AuthStore.authError.set(null);
					if ( window.location.toString().includes('code=') ) {
						window.location.assign($page.path);
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
    onMount(handleMount);
</script>
<slot></slot>