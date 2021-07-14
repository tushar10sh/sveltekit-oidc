import { accessToken, refreshToken, userInfo } from './AuthStore';
export async function authFetch( url: string, headers: any, body: any) {
    return await fetch(url, {
        headers:{
            ...headers,
            access_token: accessToken,
            refresh_token: refreshToken,
            userInfo: JSON.stringify(userInfo)
        },
        body: body
    })
}
export async function fetchWithTimeout(resource, options) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
  
    return response;
  }