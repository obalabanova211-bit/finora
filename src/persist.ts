/* Сохранение состояния в браузере. Данные остаются на устройстве —
   сервера нет, экспорт/импорт как предохранитель (Фаза 0). */

import { type AppState } from "./store";

export const STORE_KEY = "finora-v1";

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; data?: AppState };
    if (parsed.v !== 1 || !parsed.data || !Array.isArray(parsed.data.obligations)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveState(st: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, saved: new Date().toISOString(), data: st }));
  } catch {
    // переполнение хранилища не должно ронять приложение
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    // игнорируем
  }
}
