<script>
    import "../app.postcss";
    import Keycloak from '$lib/keycloak/Keycloak.svelte';
</script>

<Keycloak
    issuer={import.meta.env.VITE_OIDC_ISSUER}
    client_id={import.meta.env.VITE_OIDC_CLIENT_ID}
    scope={import.meta.env.VITE_OIDC_CLIENT_SCOPE}
    redirect_uri={import.meta.env.VITE_OIDC_REDIRECT_URI}
    >
    <slot></slot>
</Keycloak>