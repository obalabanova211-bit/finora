"use client";

import { useState } from "react";
import { effRate, splitPayment, fmtKop, parseRubToKop, type Obligation } from "../domain";
import { recordPayment, type AppState } from "../store";

export default function PayModal({ st, ob, apply, toast, onClose }: {
  st: AppState; ob: Obligation; apply: (next: AppState) => void; toast: (m: string) => void; onClose: () => void;
}) {
  const hasBalance = ob.balanceKop !== null;
  const [amt, setAmt] = useState(ob.payKop !== null ? kopToInput(ob.payKop) : "");
  const [useAuto, setUseAuto] = useState(true);
  const [exact, setExact] = useState("");
  const [err, setErr] = useState("");

  const er = effRate(ob);
  const amountKop = parseRubToKop(amt) ?? 0;
  const preview =
    hasBalance && er && ob.balanceKop
      ? splitPayment(ob.balanceKop, er.rateSot, amountKop)
      : null;

  const save = () => {
    if (!(amountKop > 0)) { setErr("Напишите сумму"); return; }
    const exactKop = exact.trim() === "" ? null : parseRubToKop(exact);
    const r = recordPayment(st, ob.id, amountKop, { useAuto, exactBalanceKop: exactKop }, new Date());
    apply(r.state);
    onClose();
    toast(r.closedNow ? "Обязательство закрыто" : "Оплата записана");
  };

  return (
    <div className="mask" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Оплата: {ob.name}</h3>
        <label className="f">Сколько заплатили, ₽</label>
        <input type="number" min={1} step="any" value={amt} onChange={e => setAmt(e.target.value)} placeholder="Сумма" autoFocus />
        <div className="err">{err}</div>
        {preview && (
          <p className="mut sm" style={{ marginTop: 8 }}>
            Примерно: проценты {fmtKop(preview.interestKop)}, тело {fmtKop(Math.max(0, preview.bodyKop))}
            {er!.est ? " (ставка оценена по графику)" : ""}
            {!preview.covers ? " — платёж не покрывает проценты" : ""}
          </p>
        )}
        {hasBalance && (
          <>
            <div className="hr" />
            <div className="switch" onClick={() => setUseAuto(v => !v)}>
              <span className="t">Учесть платёж в остатке<small>Остаток уменьшится на «тело» из оценки</small></span>
              <span className={"tg" + (useAuto ? " on" : "")}><i /></span>
            </div>
            <label className="f">Точный остаток из приложения банка (необязательно)</label>
            <input type="number" min={0} step="any" value={exact} onChange={e => setExact(e.target.value)} placeholder="Например: 82 300" />
          </>
        )}
        <button className="btn" onClick={save}>Оплачено</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

function kopToInput(kop: number): string {
  return String(kop / 100);
}
