<script lang="ts">
    import KeycloakProtectedRoute from '$lib/keycloak/KeycloakProtectedRoute.svelte';
</script>

<KeycloakProtectedRoute>
    <div class="h-screen-minus-navbar bg-gray-800 text-white flex flex-col justify-center items-center w-full">
        This is a protected page
    </div>
</KeycloakProtectedRoute>