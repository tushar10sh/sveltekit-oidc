<script lang="ts">

    import { browser } from '$app/env';
    import { session, page } from '$app/stores';
    import { getContext } from 'svelte';
    import { OIDC_CONTEXT_CLIENT_PROMISE } from './Keycloak.svelte';

    const loadUser = async () => {
        if ( browser ) {
            const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE);
            const oidc_func = await oidcPromise;
            //@ts-ignore
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
