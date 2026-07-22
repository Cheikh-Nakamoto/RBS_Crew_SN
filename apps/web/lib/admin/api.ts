import ky from 'ky';
import { API_BASE } from '../api-base';

export function getAdminApi(token: string) {
  return ky.create({
    prefixUrl: `${API_BASE}/admin`,
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAuthedApi(token: string) {
  return ky.create({
    prefixUrl: API_BASE,
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}` },
  });
}
