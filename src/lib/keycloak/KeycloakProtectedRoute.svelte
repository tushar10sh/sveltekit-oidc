<script lang="ts">

    import { browser } from '$app/env';
    import { session, page } from '$app/stores';
    import { getContext } from 'svelte';
    import { OIDC_CONTEXT_CLIENT_PROMISE } from './Keycloak.svelte';
    import type { OidcContextClientPromise } from '$lib/types';
    import { isTokenExpired } from './utils';
    const loadUser = async () => {
        let isAuthenticated = false;
        if ( browser ) {
            const oidcPromise: OidcContextClientPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE);
            const oidc_func = await oidcPromise;
            const { redirect } = oidc_func($page.path, $page.params);
            if ( !$session?.user || !$session?.access_token || !$session?.user ) {
                try {
                    console.log(redirect)
                    window.location.assign(redirect);
                } catch(e){ console.error(e)}
            } else {
                if ( isTokenExpired($session.access_token) ) {
                    console.log(redirect)
                    window.location.assign(redirect);
                }
                isAuthenticated = true;
            }
        }
        return isAuthenticated;
	}
    $: isAuthenticated = browser ? isTokenExpired($session.access_token) : false;

</script>

{#await loadUser()}
    <p>Loading...</p>
{:then}
    {#if isAuthenticated }
        <slot></slot>
    {/if}
{/await}
