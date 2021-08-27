import {
    renewOIDCToken,
    oidcBaseUrl,
    clientId
} from '$lib/keycloak/utils';
import { clientSecret } from './_secret';

import type { Locals } from '$lib/types';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
 export const post: RequestHandler<Locals, FormData> = async (request) => {
	// the `slug` parameter is available because this file
	// is called [slug].json.js

    // console.log('Refresh token:', request.body.get('refresh_token'));
	const data = await renewOIDCToken(request.body.get('refresh_token'), oidcBaseUrl, clientId, clientSecret);

    const response = {
		body: {
            ...data
        }
	};

    return response;

}