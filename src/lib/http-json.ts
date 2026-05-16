export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();

  if (!body.trim()) {
    throw new Error(`Empty response from ${response.url || 'server'}`);
  }

  if (!contentType.toLowerCase().includes('application/json') && !body.trim().startsWith('{') && !body.trim().startsWith('[')) {
    throw new Error(`Non-JSON response from ${response.url || 'server'}`);
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : `Invalid JSON response from ${response.url || 'server'}`
    );
  }
}

