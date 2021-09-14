<script lang="ts">
    import {  getContext } from 'svelte';
    import {
        OIDC_CONTEXT_CLIENT_PROMISE,
        login,
    } from './Keycloak.svelte';
    import type { OidcContextClientPromise } from '../types';

    const oidcPromise: OidcContextClientPromise = getContext(OIDC_CONTEXT_CLIENT_PROMISE);
    let clazz: string = "btn btn-primary";
    export { clazz as class };
</script>

<button 
    class={clazz}
    on:click|preventDefault='{() => login(oidcPromise) }'
    >
    <slot></slot>
</button>