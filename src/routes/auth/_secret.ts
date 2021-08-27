export let clientSecret = null; 
( () => {
    try {
	    clientSecret = process.env.VITE_OIDC_CLIENT_SECRET || import.meta.env.VITE_OIDC_CLIENT_SECRET;
    } catch(e) {}
})()