"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtKop, monthPayments, monthTotals, loadPercent, MONTH_RU, MONTH_RU_G, parseRubToKop } from "../src/domain";
import { listSections, sectionTotals } from "../src/store";
import { useAppState } from "../src/ui/useAppState";
import Toast from "../src/ui/Toast";

export default function HomePage() {
  const { st, ready, apply, toastMsg, toast } = useAppState();
  const [incOpen, setIncOpen] = useState(false);
  const [incVal, setIncVal] = useState("");

  if (!ready || !st) return <Toast msg={toastMsg} />;

  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  const pays = monthPayments(st.obligations, st.journal, y, m, t);
  const tot = monthTotals(pays);
  const secs = listSections(st);
  const sum = sectionTotals(secs).balanceTotal;
  const activeN = secs.credits.length + secs.regular.length + secs.events.length;
  const load = loadPercent(pays, st.incomeKop);
  const missed = pays.filter(p => p.status === "missed");
  const upcoming = pays.filter(p => p.status === "upcoming").slice(0, 3);

  const saveIncome = () => {
    const kop = incVal.trim() === "" ? null : parseRubToKop(incVal);
    if (incVal.trim() !== "" && !(kop !== null && kop > 0)) { toast("Похоже, это не число"); return; }
    apply({ ...st, incomeKop: kop });
    setIncOpen(false);
    toast(kop ? "Доход обновлён" : "Доход убран");
  };

  return (
    <>
      <h1>Finora</h1>
      <div className="card">
        <div className="k">Сумма обязательств</div>
        <div className="big num">{fmtKop(sum)}</div>
        <div className="mut sm">{activeN} активных</div>
      </div>

      <div className="card">
        <div className="row"><span className="k">Платежи · {MONTH_RU[m]}</span><span className="num" style={{ fontWeight: 800 }}>{fmtKop(tot.sum)}</span></div>
        <div className="hr" />
        <div className="row">
          <span className="mut sm">Оплачено {tot.paidN} из {tot.count} · {fmtKop(tot.paidSum)}</span>
          {tot.missN ? <span className="badge b-red">Пропущенных: {tot.missN}</span> : <span className="badge b-ok">Без пропусков</span>}
        </div>
        <div className="row"><span className="mut sm">Осталось оплатить в этом месяце</span><b className="num">{fmtKop(tot.remainSum)}</b></div>
      </div>

      <div className="card">
        <div className="k">Финансовая нагрузка</div>
        <div className="row" style={{ marginTop: 4 }}>
          <span className="big num">{load === null ? "—" : load + "%"}</span>
          <button className="linkbtn" onClick={() => { setIncVal(st.incomeKop !== null ? String(st.incomeKop / 100) : ""); setIncOpen(true); }}>
            {st.incomeKop !== null ? "Доход " + fmtKop(st.incomeKop) : "Указать доход"} ✎
          </button>
        </div>
        <div className="loadbar"><i style={{ width: load === null ? 0 : Math.min(100, load), background: load !== null && load > 60 ? "#B9770E" : undefined }} /></div>
        {load === null
          ? <p className="mut sm">Укажите доход, чтобы видеть нагрузку.</p>
          : <p className="mut sm">Платежи месяца к доходу за месяц.</p>}
      </div>

      {missed.length > 0 && (
        <div className="red-note">Пропущен: {missed.map(p => p.ob.name + ", " + p.date.getDate() + " " + MONTH_RU_G[p.date.getMonth()]).join("; ")}</div>
      )}

      <h2>Ближайшие платежи</h2>
      {upcoming.length > 0 ? upcoming.map(p => (
        <div className="card ob row" key={p.ob.id}>
          <Link href={"/item/" + p.ob.id} className="ob" style={{ flex: 1 }}>
            <b>{p.ob.name}</b><br />
            <span className="mut sm">{p.date.getDate()} {MONTH_RU_G[p.date.getMonth()]} · {p.ob.category}</span>
          </Link>
          <span className="num" style={{ fontWeight: 800 }}>{fmtKop(p.amountKop)}</span>
        </div>
      )) : (
        <div className="card empty"><div className="e">На этот месяц всё оплачено</div></div>
      )}

      <Link href="/add" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 18 }}>+ Добавить обязательство</Link>

      {incOpen && (
        <div className="mask" onClick={e => { if (e.target === e.currentTarget) setIncOpen(false); }}>
          <div className="modal">
            <h3>Доход за месяц</h3>
            <label className="f">Сколько получаете в месяц, ₽</label>
            <input type="number" min={0} step="any" value={incVal} onChange={e => setIncVal(e.target.value)} placeholder="Например: 120 000" autoFocus />
            <button className="btn" onClick={saveIncome}>Сохранить</button>
            <button className="btn ghost" onClick={() => setIncOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
      <Toast msg={toastMsg} />
    </>
  );
}
