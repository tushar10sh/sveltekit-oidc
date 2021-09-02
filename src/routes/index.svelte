<script context="module" lang="ts">
    export const ssr = true;
</script>

<script lang="ts">
    import { isAuthenticated, isLoading, authError, accessToken } from '$lib/keycloak/AuthStore';
    import LoginButton from '$lib/keycloak/LoginButton.svelte';
    import LogoutButton from '$lib/keycloak/LogoutButton.svelte';

    import KeycloakProtectedRoute from '$lib/keycloak/KeycloakProtectedRoute.svelte';

    let access_token_elem;
    // let access_token_copy_btn;
    let is_access_token_copied = false;
    function copyAccessTokenToClipboard() {
        if ( access_token_elem ) {
            try {
                const selection = window.getSelection();        
                const range = document.createRange();
                range.selectNodeContents(access_token_elem);
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
                // access_token_copy_btn.innerHTML = 'Copied!';
                is_access_token_copied = true;
                setTimeout(() => {
                    // access_token_copy_btn.innerHTML = 'Copy';
                    is_access_token_copied = false;
                }, 1000);
            } catch(e) {
                console.log(access_token_elem);
                console.error(e)
            }
        }
    }

</script>

<main class="h-screen-minus-navbar w-screen flex flex-col justify-center items-center bg-gray-800">
    
    <h1 class="mb-4 p-4 text-5xl bg-pink-600 text-gray-200 font-semibold rounded-md shadow-md">Sveltekit + OpenID Auth</h1>

    {#if $isAuthenticated}
        <section class="p-5 bg-green-100 text-center flex flex-col justify-start items-center shadow-lg rounded-lg">
            <div><span class="font-bold text-gray-800">Access Token</span></div>
            <div class="flex flex-row justify-end items-start w-100">
                <p access-token class="break-words w-100 max-w-5xl m-2 border-none overflow-visible font-mono text-gray-600" bind:this={access_token_elem}>{$accessToken}</p>
                <div class="flex flex-col justify-start items-center w-100">
                    <button class="btn btn-primary" on:click|preventDefault={copyAccessTokenToClipboard}>Copy</button>
                    {#if is_access_token_copied }
                        <div class="bg-gray-800 text-green-300 rounded-md p-2 text-xs">Copied!</div>
                    {/if}
                </div>
            </div>
            <LogoutButton>Logout</LogoutButton>
        </section>
    {:else if $authError} 
        <section class="p-5 rounded-lg bg-red-400">
            {$authError?.error_description}
        </section>
    {:else if $isLoading}
        <section class="px-10 py-5 h-20 shadow-md rounded-lg bg-pink-400 text-white font-mono font-semibold flex flex-row justify-center items-center">
            Loading ...
        </section>
    {:else}
        <section class="px-10 py-5 shadow-md rounded-lg bg-pink-400 text-white font-mono font-semibold flex flex-col justify-center items-center">
            <p class="block p-2">NO AUTH AVAILABLE</p>
            <LoginButton>Login</LoginButton>
        </section>
    {/if}
</main>
