<script>
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        login,
    } from './Keycloak.svelte';

    const oidcPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE)
</script>

<button 
    class="btn btn-primary"
    on:click|preventDefault='{() => login(oidcPromise) }'
    >
    <slot></slot>
</button>