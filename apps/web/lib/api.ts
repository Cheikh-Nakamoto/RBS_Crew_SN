import ky from 'ky';

// On the server (SSR/RSC), use the internal Docker service URL if set.
// On the client, always use the public-facing URL.
const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

export const api = ky.create({
  prefixUrl: API_URL,
  timeout: 10000,
});

export function authedApi(token: string) {
  return api.extend({
    headers: { Authorization: `Bearer ${token}` },
  });
}
