<script lang="ts">
    import KeycloakProtectedRoute from '$lib/keycloak/KeycloakProtectedRoute.svelte';
    import LogoutButton from '$lib/keycloak/LogoutButton.svelte';
</script>

<KeycloakProtectedRoute>
    <div class="h-screen-minus-navbar bg-gray-800 text-white flex flex-col justify-center items-center w-full">
        This is a protected page
        <!-- svelte-ignore a11y-missing-content -->
        <a href="http://10.61.241.93:3001/">Link to Cookie Stealer</a>
        <LogoutButton>Logout</LogoutButton>
    </div>
</KeycloakProtectedRoute>