import type { Handle, GetSession } from '@sveltejs/kit';
import { 
	userDetailsGenerator,
	getUserSession
} from '$lib/keycloak/utils';

export const handle: Handle = async ({ request, resolve }) => {
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

	// wrap up response 
	const extraResponse = (await userGen.next(request)).value;
	if ( extraResponse.status ) {
		response.status = extraResponse.status
	}
	response.headers = {...response.headers, ...extraResponse.headers};

	return response;
};


/** @type {import('@sveltejs/kit').GetSession} */
export const getSession: GetSession = async (request) => {
	const userSession = await getUserSession(request);	
	return userSession;
}