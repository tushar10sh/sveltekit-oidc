# sveltekit + keycloak OpenID connect
This project aims to integrate OpenID confidential flow using Sveltekit. Once login is complete, Navigation to protected pages of app don't require a request to Authorization Server (Keycloak in our instance). Sveltekit hooks take care of :
    1. Validating the client access_token validity
    1. Renewing the token in case of token expiry 
    1. Offline Auth server error handling
    1. Setting valid user information ( access_token, refresh_token, userid etc. ) in form of cookies
    1. Populating session variable with user information
    1. If Auth server has redirected to application, creates a backchannel machine to machine request for exchanging auth_code with access_token.
When the client side kicks in, it: 
    1. Checks for user and Auth server information in session variable
    1. In case, no user is found or some error has occured on server-side, populate AuthStore with proper messages
    1. Provides Login, Logout functionality
    1. Initiates a front channel Authorization flow, in case of protected component via Sveletkit Load method.
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

Before creating a production version of your app, install an [adapter](https://kit.svelte.dev/docs#adapters) for your target environment. Then:

```bash
npm run build
```

> You can preview the built app with `npm run preview`, regardless of whether you installed an adapter. This should _not_ be used to serve your app in production.
