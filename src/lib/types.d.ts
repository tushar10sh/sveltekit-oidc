export type AuthError = {
    error: string;
    error_description: string;
}
export interface Locals {
	userid: string;
	access_token: string;
	refresh_token: string;
    authError?: AuthError;
	user?: any;
    retries?: number;
}

export type OidcContextClientFn = (request_path?: string, request_params?: Record<string, string>) => {
    redirect: string;
    session: any;
    issuer: string;
    page: Page;
}

export type OidcContextClientPromise = Promise<OidcContextClientFn>

export interface OIDCSuccessResponse {
	access_token: string;
	id_token: string;
	refresh_token: string;
}

export interface OIDCFailureResponse extends AuthError {
}

export type OIDCResponse = OIDCSuccessResponse & OIDCFailureResponse;