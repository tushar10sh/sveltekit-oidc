/// <reference types="@sveltejs/kit" />
interface ImportMetaEnv {
    VITE_OIDC_ISSUER: string;
    VITE_OIDC_CLIENT_ID: string;
    VITE_OIDC_CLIENT_SECRET: string;
    VITE_OIDC_REDIRECT_URI: string;
    VITE_OIDC_POST_LOGOUT_REDIRECT_URI: string;
    VITE_OIDC_CLIENT_SCOPE: string;
    VITE_OIDC_TOKEN_REFRESH_MAX_RETRIES: number;
    VITE_REFRESH_TOKEN_ENDPOINT: string;
}