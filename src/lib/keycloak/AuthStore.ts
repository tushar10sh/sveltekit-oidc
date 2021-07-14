import { writable } from 'svelte/store';
/**
* Stores
*/
export const isLoading = writable(true);
export const isAuthenticated = writable(false);
export const accessToken = writable('');
export const idToken = writable('');
export const refreshToken = writable('');
export const userInfo = writable({});
export const authError = writable(null);