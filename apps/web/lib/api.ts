import ky from 'ky';
import { API_BASE } from './api-base';

export const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 10000,
  hooks: {
    beforeError: [
      (error) => {
        console.error(`[API ERROR] ${error.request.method} ${error.request.url} - ${error.message}`);
        return error;
      },
    ],
  },
});

export function authedApi(token: string) {
  return api.extend({
    headers: { Authorization: `Bearer ${token}` },
  });
}
