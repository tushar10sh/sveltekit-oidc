import type { Handle, GetSession } from '@sveltejs/kit';
import { 
	userDetailsGenerator,
	getUserSession
} from '$lib/keycloak/utils';
import { clientSecret } from './routes/auth/_secret';

import type { Locals } from '$lib/types';

import type { ServerRequest } from '@sveltejs/kit/types/hooks';

export const handle: Handle<Locals>  = async ({ request, resolve }) => {
	// Initialization part
	const userGen = userDetailsGenerator(request, clientSecret);
	const { value, done } = await userGen.next();
	if ( done ) {
		const response = value;
		return response;
	}

	// Your code here -----------
	if (request.query.has('_method')) {
		request.method = request.query.get('_method').toUpperCase();
	}
	// Handle resolve
	const response = await resolve(request);


	// After your code ends, Populate response headers with Auth Info
	// wrap up response by over-riding headers and status
	const extraResponse = (await userGen.next(request)).value;
	const { Location, ...restHeaders } = extraResponse.headers;
	// SSR Redirection
	if ( extraResponse.status === 302 && Location ) {
		response.status = extraResponse.status
		response.headers['Location'] = Location;
	}
	response.headers = {...response.headers, ...restHeaders};

	// Return response back
	return response;
};


/** @type {import('@sveltejs/kit').GetSession} */
export const getSession: GetSession = async (request: ServerRequest<Locals>) => {
	const userSession = await getUserSession(request, clientSecret);	
	// console.log(userSession);
	return userSession;
}