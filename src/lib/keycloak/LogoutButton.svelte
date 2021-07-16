<script>
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI,
        logout,
    } from './Keycloak.svelte';

    const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE);
    const post_logout_redirect_uri = getContext(OIDC_CONTEXT_POST_LOGOUT_REDIRECT_URI);
</script>

<button class="px-4 py-2 rounded-md shadow-md bg-gray-200 text-gray-800 font-semibold m-2 transition-colors duration-300 ease-in-out hover:bg-gray-700 hover:text-gray-100" on:click|preventDefault='{() => logout(oidcPromise, post_logout_redirect_uri) }'><slot></slot></button>