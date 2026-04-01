import ky from 'ky';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = ky.create({
  prefixUrl: API_URL,
  timeout: 10000,
});

export function authedApi(token: string) {
  return api.extend({
    headers: { Authorization: `Bearer ${token}` },
  });
}
