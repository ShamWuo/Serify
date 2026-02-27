import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const isUUID = (val: string) => {

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) || /^\d+$/.test(val);
};
