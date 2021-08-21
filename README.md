# sveltekit + keycloak OpenID connect
This project aims to integrate OpenID confidential flow using Sveltekit. Once login is complete, Navigation to protected pages of app don't require a request to Authorization Server (Keycloak in our instance). Sveltekit hooks take care of :

    * Validating the client access_token validity
    * Renewing the token in case of token expiry 
    * Offline Auth server error handling
    * Setting valid user information ( access_token, refresh_token, userid etc. ) in form of cookies
    * Populating session variable with user information
    * If Auth server has redirected to application, creates a backchannel machine to machine request for exchanging auth_code with access_token.

When the client side kicks in, it: 

    * Checks for user and Auth server information in session variable
    * In case, no user is found or some error has occured on server-side, populate AuthStore with proper messages
    * Provides Login, Logout functionality
    * Initiates a front channel Authorization flow, in case of protected component via Sveletkit Load method.

# Usage
### Inside your hooks.ts
```ts

    import type { Handle, GetSession } from '@sveltejs/kit';
    import { 
        userDetailsGenerator,
        getUserSession
    } from '$lib/keycloak/utils';
    import type { Locals } from '$lib/types';

    import type { ServerRequest } from '@sveltejs/kit/types/hooks';

    export const handle: Handle<Locals>  = async ({ request, resolve }) => {
        const userGen = userDetailsGenerator(request);
        const { value, done } = await userGen.next();
        if ( done ) {
            const response = value;
            return response;
        }

        if (request.query.has('_method')) {
            request.method = request.query.get('_method').toUpperCase();
        }
        // Handle resolve
        const response = await resolve(request);

        // wrap up response by over-riding headers and status
        const extraResponse = (await userGen.next(request)).value;
        if ( extraResponse.status ) {
            response.status = extraResponse.status
        }
        response.headers = {...response.headers, ...extraResponse.headers};

        return response;
    };


    /** @type {import('@sveltejs/kit').GetSession} */
    export const getSession: GetSession = async (request: ServerRequest<Locals>) => {
        const userSession = await getUserSession(request);	
        return userSession;
    }

```

### Inside your __layout.svelte component
```html
    <script>
        import "../app.postcss";
        import Keycloak from '$lib/keycloak/Keycloak.svelte';
    </script>


    <Keycloak
        issuer={import.meta.env.VITE_OIDC_ISSUER}
        client_id={import.meta.env.VITE_OIDC_CLIENT_ID}
        scope={import.meta.env.VITE_OIDC_CLIENT_SCOPE}
        redirect_uri={import.meta.env.VITE_OIDC_REDIRECT_URI}
        post_logout_redirect_uri={import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI}
        >
        <slot></slot>
    </Keycloak>
```

### For protected routes
```html
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
```
# Application Screenshots

### Login / Index page 
![Login Page](https://github.com/tushar10sh/sveltekit-oidc/blob/main/docs/Login_page.png?raw=true)

### Once user clicks login, Redirection to Auth server
![Keycloak Auth](https://github.com/tushar10sh/sveltekit-oidc/blob/main/docs/keycloak_redirect_page.png?raw=true)

### Auth Complete with backchannel token exchange and client hydrated with access_token
![Index page with JWT](https://github.com/tushar10sh/sveltekit-oidc/blob/main/docs/Index_page_with_token.png?raw=true)

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

```bash
npm run build
```