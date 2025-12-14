const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    // Futuramente podemos melhorar o tratamento de erro aqui
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  // Se a resposta for 204 No Content, retorna null (evita erro de JSON vazio)
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}