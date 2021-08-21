<script lang="ts">
    import KeycloakProtectedRoute from '$lib/keycloak/KeycloakProtectedRoute.svelte';
    import LogoutButton from '$lib/keycloak/LogoutButton.svelte';
</script>

<KeycloakProtectedRoute>
    <div class="h-screen-minus-navbar bg-gray-800 text-white flex flex-col justify-center items-center w-full">
        This is a protected page

        <LogoutButton>Logout</LogoutButton>
    </div>
</KeycloakProtectedRoute>