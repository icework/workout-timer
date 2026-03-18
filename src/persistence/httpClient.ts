export async function requestJson<TResponse>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Fall back to the default error message.
    }

    throw new Error(message);
  }

  return (await response.json()) as TResponse;
}
