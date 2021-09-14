import { renewOIDCToken } from '$lib';

import type { Locals } from '$lib/types';
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