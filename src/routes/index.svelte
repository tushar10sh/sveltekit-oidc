<script lang="ts">
    import { isAuthenticated, authError, accessToken } from '$lib/keycloak/AuthStore';
    let access_token_elem;
    let access_token_copy_btn;
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
                access_token_copy_btn.innerHTML = 'Copied!';
                setTimeout(() => {
                    access_token_copy_btn.innerHTML = 'Copy';
                }, 1000);
            } catch(e) {
                console.log(access_token_elem);
                console.error(e)
            }
        }
    }
</script>


<main class="h-screen w-screen flex flex-col justify-center items-center bg-yellow-200">
    
    <h1 class="mb-4 p-4 text-5xl bg-pink-400 text-gray-900 font-semibold rounded-md shadow-md">Sveltekit + OpenID Auth</h1>

    {#if $isAuthenticated}
        <section class="p-5 bg-green-100 text-center flex flex-col justify-start items-center shadow-lg rounded-lg">
            <div><span class="font-bold text-gray-800">Access Token</span></div>
            <div class="flex flex-row justify-end items-start w-100">
                <p access-token class="break-words w-100 max-w-5xl m-2 border-none overflow-visible" bind:this={access_token_elem}>{$accessToken}</p>
                <button class="px-4 py-2 rounded-md shadow-md bg-gray-200 text-gray-800 m-2 transition-colors duration-300 ease-in-out hover:bg-gray-700 hover:text-gray-100" bind:this={access_token_copy_btn} on:click|preventDefault={copyAccessTokenToClipboard}>Copy</button>
            </div>
        </section>
    {:else if $authError} 
        <section class="p-5 rounded-lg bg-red-400">
            {$authError?.error_description}
        </section>
    {:else}
        <section class="px-10 py-5 h-20 shadow-md rounded-lg bg-pink-400 text-white font-mono font-semibold flex flex-row justify-center items-center">
            NO AUTH AVAILABLE
        </section>
    {/if}
</main>