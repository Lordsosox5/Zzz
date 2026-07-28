import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const TOKEN_KEY = 'ehr_token';
export const USER_KEY = 'ehr_user';

export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    // Replit dev proxy: 8081-xxxx.replit.dev → 8080-xxxx.replit.dev
    if (/^\d+-[^.]+\.replit\.dev$/.test(hostname)) {
      return `${protocol}//${hostname.replace(/^\d+-/, '8080-')}`;
    }
    return `${protocol}//${hostname}:8080`;
  }
  return 'http://localhost:8080';
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const url = `${getApiUrl()}/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
