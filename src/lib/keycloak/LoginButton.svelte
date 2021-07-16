<script>
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        OIDC_CONTEXT_REDIRECT_URI,
        login,
    } from './Keycloak.svelte';

    const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE)
</script>

<button class="px-4 py-2 rounded-md shadow-md bg-gray-200 text-gray-800 font-semibold m-2 transition-colors duration-300 ease-in-out hover:bg-gray-700 hover:text-gray-100" on:click|preventDefault='{() => login(oidcPromise) }'><slot></slot></button>