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

<button
    class="btn btn-primary"
    on:click|preventDefault='{() => logout(oidcPromise, post_logout_redirect_uri) }'
    >
    <slot></slot>
</button>