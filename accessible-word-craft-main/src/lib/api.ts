// API configuration and helpers

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Get headers for API requests.
 * Includes API key if configured (production only).
 */
export function getApiHeaders(contentType?: string): HeadersInit {
  const headers: HeadersInit = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  // Only include API key if it's configured (production)
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
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
