const API_URL = import.meta.env.VITE_API_BASE_URL;

export async function request<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    init,
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ??
        `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}
