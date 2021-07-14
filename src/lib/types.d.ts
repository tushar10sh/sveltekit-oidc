export type AuthError = {
    error: string;
    error_description: string;
}
export interface Locals {
	userid: string;
	access_token: string;
	refresh_token: string;
    authError?: AuthError;
    retries?: number;
}

export interface OIDCSuccessResponse {
	access_token: string;
	id_token: string;
	refresh_token: string;
}

export interface OIDCFailureResponse extends AuthError {
}

export type OIDCResponse = OIDCSuccessResponse & OIDCFailureResponse;