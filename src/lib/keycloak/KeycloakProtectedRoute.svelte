<script lang="ts">

    import { browser } from '$app/env';
    import { session, page } from '$app/stores';
    import { getContext } from 'svelte';
    import { OIDC_CONTEXT_CLIENT_PROMISE } from './Keycloak.svelte';
    import type { OidcContextClientFn, OidcContextClientPromise } from '$lib/types';

    const loadUser = async () => {
        if ( browser ) {
            const oidcPromise: OidcContextClientPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE);
            const oidc_func: OidcContextClientFn = await oidcPromise;
            const { redirect } = oidc_func($page.path, $page.params);
            console.log(redirect)
            if ( !$session?.user || !$session?.access_token || !$session?.user ) {
                try {
                    console.log(redirect)
                    window.location.assign(redirect);
                } catch(e){ console.error(e)}
            }
        }
	}

</script>

{#await loadUser()}
    <p>Loading...</p>
{:then}
    <slot></slot>
{/await}
