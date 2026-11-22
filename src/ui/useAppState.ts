"use client";

/* Клиентский хук: держит AppState в React и сохраняет в localStorage.
   Все расчёты делают чистые функции из store; здесь только сохранение результата. */

import { useCallback, useEffect, useRef, useState } from "react";
import { type AppState, emptyState } from "../store";
import { loadState, saveState } from "../persist";
import { demoState } from "../seed";

export function useAppState() {
  const [st, setSt] = useState<AppState | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSt(loadState() ?? emptyState());
  }, []);

  useEffect(() => {
    if (st) saveState(st);
  }, [st]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  const apply = useCallback((next: AppState) => setSt(next), []);
  const loadDemo = useCallback(() => setSt(demoState()), []);

  return { st, ready: st !== null, apply, loadDemo, toastMsg, toast };
}

export type AppActions = ReturnType<typeof useAppState>;
