# sveltekit + keycloak OpenID connect
This project aims to integrate OpenID confidential flow using Sveltekit. Once login is complete, Navigation to protected pages of app don't require a request to Authorization Server (Keycloak in our instance). Sveltekit hooks take care of :

    * Silent Refresh Workflow
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
    * Logout in one browser tab initiates automatic logout from all tabs.
    * Prompt on all browser tabs and Page reloading on User Login.

Complete JWT Implementation based on [Hasura Blog on BEST Practices for JWT AUTH](https://hasura.io/blog/best-practices-of-using-jwt-with-graphql/)
### Npm Package link
https://www.npmjs.com/package/sveltekit-oidc
# Usage

<code>
    npm i sveltekit-oidc
</code>


##
## Configuration
Create an .env file in project root with following content

```ts
VITE_OIDC_ISSUER="http://localhost:28080/auth/realms/hasura"
VITE_OIDC_CLIENT_ID="hasura-app"
VITE_OIDC_CLIENT_SECRET="1439e34f-343e-4f71-bbc7-cc602dced84a"
VITE_OIDC_REDIRECT_URI="http://localhost:3000"
VITE_OIDC_POST_LOGOUT_REDIRECT_URI="http://localhost:3000"
VITE_OIDC_CLIENT_SCOPE="openid profile email hasura-claims"
VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES="5"
VITE_REFRESH_TOKEN_ENDPOINT="/auth/refresh_token"
VITE_REFRESH_PAGE_ON_SESSION_TIMEOUT=true
```

### Inside your src/global.d.ts

```ts
interface ImportMetaEnv {
    VITE_OIDC_ISSUER: string;
    VITE_OIDC_CLIENT_ID: string;
    VITE_OIDC_CLIENT_SECRET: string;
    VITE_OIDC_REDIRECT_URI: string;
    VITE_OIDC_POST_LOGOUT_REDIRECT_URI: string;
    VITE_OIDC_CLIENT_SCOPE: string;
    VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES: number;
    VITE_REFRESH_TOKEN_ENDPOINT: string;
    VITE_REFRESH_PAGE_ON_SESSION_TIMEOUT: boolean;
}
```
### REFESH_TOKEN_ENDPOINT
Create a refresh_token endpoint as set in .env file (VITE_REFRESH_TOKEN_ENDPOINT) we have set /auth/refresh_token.
As such, create file src/routes/auth/refresh_token.ts 
```ts
import { renewOIDCToken } from 'sveltekit-oidc';

import type { Locals } from 'sveltekit-oidc/types';
import type { RequestHandler } from '@sveltejs/kit';

const oidcBaseUrl = `${import.meta.env.VITE_OIDC_ISSUER}/protocol/openid-connect`;
const clientId = `${import.meta.env.VITE_OIDC_CLIENT_ID}`;
const clientSecret = process.env.VITE_OIDC_CLIENT_SECRET || import.meta.env.VITE_OIDC_CLIENT_SECRET;
/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
 export const post: RequestHandler<Locals, FormData> = async (request) => {

	const data = await renewOIDCToken(request.body.get('refresh_token'), oidcBaseUrl, clientId, clientSecret);

    const response = {
		body: {
            ...data
        }
	};

    return response;

}
```
### Inside your src/hooks.ts
```ts
import type { Handle, GetSession } from '@sveltejs/kit';
import { 
    userDetailsGenerator,
    getUserSession
} from 'sveltekit-oidc';
import type { Locals } from 'sveltekit-oidc/types';

import type { ServerRequest } from '@sveltejs/kit/types/hooks';

const clientSecret = process.env.VITE_OIDC_CLIENT_SECRET || import.meta.env.VITE_OIDC_CLIENT_SECRET;

export const handle: Handle<Locals>  = async ({ request, resolve }) => {
	// Initialization part
	const userGen = userDetailsGenerator(request, clientSecret);
	const { value, done } = await userGen.next();
	if ( done ) {
		const response = value;
		return response;
	}
	
	// Set Cookie attributes
	request.locals.cookieAttributes = 'Path=/; HttpOnly; SameSite=Lax;';

	// Your code here -----------
	if (request.query.has('_method')) {
		request.method = request.query.get('_method').toUpperCase();
	}
	// Handle resolve
	const response = await resolve(request);


	// After your code ends, Populate response headers with Auth Info
	// wrap up response by over-riding headers and status
    if ( response?.status !== 404 ) {
		const extraResponse = (await userGen.next(request)).value;
		const { Location, ...restHeaders } = extraResponse.headers;
		// SSR Redirection
		if ( extraResponse.status === 302 && Location ) {
			response.status = extraResponse.status
			response.headers['Location'] = Location;
		}
		response.headers = {...response.headers, ...restHeaders};

	}
	// Return response back
	return response;
};


/** @type {import('@sveltejs/kit').GetSession} */
export const getSession: GetSession = async (request: ServerRequest<Locals>) => {
	const userSession = await getUserSession(request, clientSecret);	
	return userSession;
}
```

### Inside your src/routes/__layout.svelte component
```html
<script lang="ts">
    import { Keycloak } from 'sveltekit-oidc';
</script>


<Keycloak
    issuer={import.meta.env.VITE_OIDC_ISSUER}
    client_id={import.meta.env.VITE_OIDC_CLIENT_ID}
    scope={import.meta.env.VITE_OIDC_CLIENT_SCOPE}
    redirect_uri={import.meta.env.VITE_OIDC_REDIRECT_URI}
    post_logout_redirect_uri={import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI}
    refresh_token_endpoint={import.meta.env.VITE_REFRESH_TOKEN_ENDPOINT}
    refresh_page_on_session_timeout={import.meta.env.VITE_REFRESH_PAGE_ON_SESSION_TIMEOUT}
    >
    <slot></slot>
</Keycloak>
```
### Use these stores for auth information 
```html
<script lang="ts">
    import { isAuthenticated, isLoading, authError, accessToken, idToken, userInfo, refreshToken, LoginButton } from 'sveltekit-oidc';
</script>

{#if $isAuthenticated}
    <div>User is authenticated</div>
{:else}
    <LoginButton class="btn btn-primary">Login</LoginButton>
{/if}
<div>
```
### For protected routes
```html
<script lang="ts">
    import { KeycloakProtectedRoute, LogoutButton } from 'sveltekit-oidc';
</script>

<KeycloakProtectedRoute>
    <div class="h-screen-minus-navbar bg-gray-800 text-white flex flex-col justify-center items-center w-full">

        This is a protected page

        <LogoutButton class="btn btn-primary">Logout</LogoutButton>
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