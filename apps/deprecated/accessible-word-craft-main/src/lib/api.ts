// API configuration and helpers

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const API_KEY_STORAGE_KEY = 'klartext_api_key';

/**
 * Get the API key from session storage.
 * The key is obtained after successful password authentication.
 */
export function getApiKey(): string | null {
  return sessionStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Store the API key in session storage.
 * Called after successful authentication.
 */
export function setApiKey(key: string): void {
  sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
}

/**
 * Clear the API key from session storage.
 * Called on logout or auth failure.
 */
export function clearApiKey(): void {
  sessionStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Get headers for API requests.
 * Includes API key if available (after authentication).
 */
export function getApiHeaders(contentType?: string): HeadersInit {
  const headers: HeadersInit = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  // Include API key if available (from session storage after auth)
  const apiKey = getApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  
  return headers;
}

/**
 * Make an API request with proper headers.
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  
  // Merge headers
  const headers = {
    ...getApiHeaders(),
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Make a JSON API request.
 */
export async function apiJsonRequest(
  endpoint: string,
  data: unknown,
  method: string = 'POST'
): Promise<Response> {
  return apiRequest(endpoint, {
    method,
    headers: getApiHeaders('application/json'),
    body: JSON.stringify(data),
  });
}
