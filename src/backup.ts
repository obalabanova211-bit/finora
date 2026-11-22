/* Резервная копия: имя файла и чтение файла копии.
   Само скачивание и выбор файла — браузерные, в экране настроек. */

import { type AppState } from "./store";

export function backupFileName(d: Date): string {
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return "finora-копия-" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + ".json";
}

export function backupDateLabel(d: Date): string {
  return d.toLocaleDateString("ru-RU");
}

export function serializeBackup(st: AppState): string {
  return JSON.stringify({ app: "finora", v: 1, saved: new Date().toISOString(), data: st }, null, 2);
}

/** Читает текст файла копии; null — если это не копия Finora */
export function parseBackup(raw: string): AppState | null {
  try {
    const j = JSON.parse(raw) as { data?: AppState } | AppState;
    const d = (j as { data?: AppState }).data && (j as { data?: AppState }).data!.obligations
      ? (j as { data?: AppState }).data!
      : (j as AppState).obligations ? (j as AppState) : null;
    if (!d || !Array.isArray(d.obligations) || !Array.isArray(d.journal)) return null;
    return { ...d, v: 1 };
  } catch {
    return null;
  }
}
