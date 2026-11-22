"use client";

import { useRef, useState } from "react";
import { useAppState } from "../../src/ui/useAppState";
import Toast from "../../src/ui/Toast";
import Confirm from "../../src/ui/Confirm";
import { backupDateLabel, backupFileName, parseBackup, serializeBackup } from "../../src/backup";
import { demoState } from "../../src/seed";

export default function SettingsPage() {
  const { st, ready, apply, toastMsg, toast } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<"demo" | "wipe" | null>(null);

  if (!ready || !st) return <Toast msg={toastMsg} />;

  const saveFile = () => {
    const blob = new Blob([serializeBackup(st)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName(new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    apply({ ...st, lastBackup: backupDateLabel(new Date()) });
    toast("Файл копии сохранён");
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const data = parseBackup(String(r.result ?? ""));
      if (!data) { toast("Файл повреждён или это не копия Finora"); return; }
      apply({ ...data, welcomed: true });
      toast("Копия загружена");
    };
    r.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const n = st.obligations.length;

  return (
    <>
      <h1>Настройки</h1>

      <h2>Резервная копия</h2>
      <div className="card">
        <p className="mut sm" style={{ marginBottom: 8 }}>Данные живут только в этом браузере. Периодически сохраняйте копию — это защита от очистки браузера и способ перенести данные на другое устройство.</p>
        <button className="btn" onClick={saveFile}>Сохранить файл копии</button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>Загрузить копию из файла</button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={e => onFile(e.target.files?.[0])} />
        <p className="mut sm" style={{ marginTop: 8 }}>{st.lastBackup ? "Последняя копия: " + st.lastBackup : "Копий ещё не было."}</p>
      </div>

      <h2>Сброс</h2>
      <div className="card">
        <button className="btn ghost" onClick={() => setConfirm("demo")}>Вернуть демонстрационные данные</button>
        <button className="btn danger" onClick={() => setConfirm("wipe")}>Стереть все данные</button>
      </div>

      <h2>О приложении</h2>
      <div className="card">
        <p className="sm">Finora — учёт обязательств: кредиты, рассрочки, регулярные платежи и то, что возвращается по событию.<br /><br />Данные хранятся только на этом устройстве и никуда не отправляются.</p>
      </div>

      {confirm === "demo" && (
        <Confirm
          title="Вернуть демо?"
          text={"Текущие данные (" + n + " обязательств и история оплат) будут заменены демонстрационными. Сначала сохраните копию."}
          yesLabel="Вернуть демо"
          onYes={() => { apply(demoState()); setConfirm(null); toast("Демо-данные возвращены"); }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "wipe" && (
        <Confirm
          title="Стереть все данные?"
          text="Сначала лучше сохранить резервную копию. Удалить всё без возврата?"
          yesLabel="Стереть всё"
          onYes={() => {
            apply({ ...st, obligations: [], journal: [], incomeKop: null, welcomed: false });
            setConfirm(null);
            toast("Все данные стёрты");
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      <Toast msg={toastMsg} />
    </>
  );
}
