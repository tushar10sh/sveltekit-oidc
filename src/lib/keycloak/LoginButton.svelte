<script lang="ts">
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        login,
    } from './Keycloak.svelte';
    import type { OidcContextClientPromise } from '$lib/types';

    const oidcPromise: OidcContextClientPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE)
</script>

<button 
    class="btn btn-primary"
    on:click|preventDefault='{() => login(oidcPromise) }'
    >
    <slot></slot>
</button>