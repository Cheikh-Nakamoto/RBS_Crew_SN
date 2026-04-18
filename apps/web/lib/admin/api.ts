import ky from 'ky';

const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

export function getAdminApi(token: string) {
  return ky.create({
    prefixUrl: `${API_URL}/admin`,
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAuthedApi(token: string) {
  return ky.create({
    prefixUrl: API_URL,
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}` },
  });
}
