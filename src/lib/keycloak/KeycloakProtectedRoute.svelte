<script lang="ts">

    import { browser } from '$app/env';
    import { session, page } from '$app/stores';
    import { getContext } from 'svelte';
    import { OIDC_CONTEXT_CLIENT_PROMISE } from './Keycloak.svelte';
    import type { OidcContextClientPromise } from '$lib/types';
import { isTokenExpired } from './utils';
    let isAuthenticated = false;
    const loadUser = async () => {
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
	}

</script>

{#await loadUser()}
    <p>Loading...</p>
{:then}
    {#if isAuthenticated }
        <slot></slot>
    {/if}
{/await}
