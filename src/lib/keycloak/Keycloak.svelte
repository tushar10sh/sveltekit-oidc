<script context="module" lang="ts">
    import * as AuthStore from './AuthStore';
</script>

<script lang="ts">
    import { setContext } from 'svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { initiateFrontChannelOIDCAuth } from './utils'; 
	import { page, session } from '$app/stores';
    // props.
	export let issuer: string;
	export let client_id: string;
	export let redirect_uri: string;

    export let scope:string;

    onMount(async function() {
		try {
			const testAuthServerResponse = await fetch(issuer,{
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if ( !testAuthServerResponse.ok ) {
				throw {
					error: await testAuthServerResponse.json()
				}
			} else {
				const oidcBaseUrl = `${issuer}/protocol/openid-connect`;
				const { redirect } = initiateFrontChannelOIDCAuth(browser, oidcBaseUrl, client_id, scope, redirect_uri);
				const relogin_initiate_error_list = [
					'missing_jwt',
					'invalid_grant',
					'invalid_token',
				];
				const relogin_initiate = $session?.error?.error ? relogin_initiate_error_list.includes($session.error.error) : false;
				if ( !$session.user && (!$session?.error || relogin_initiate) ) {
					AuthStore.isAuthenticated.set(false);
					AuthStore.accessToken.set(null);
					AuthStore.refreshToken.set(null);
					window.location.assign(redirect);
				} else if ( $session.error )  {
					AuthStore.isAuthenticated.set(false);
					AuthStore.accessToken.set(null);
					AuthStore.refreshToken.set(null);
					AuthStore.authError.set($session.error);
					if ( $session.error?.error === 'invalid_request' ) {
						window.location.assign(redirect);
					}
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
			AuthStore.isAuthenticated.set(false);
			AuthStore.accessToken.set(null);
			AuthStore.refreshToken.set(null);
			AuthStore.authError.set({
				error: 'auth_server_conn_error',
				error_description: 'Auth Server Connection Error'
			});
		}
		
	})
</script>
<slot></slot>