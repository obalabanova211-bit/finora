"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fmtKop, monthPayments, monthTotals, MONTH_RU, MONTH_RU_G, daysInMonth,
  type MonthPayment,
} from "../../src/domain";
import { useAppState } from "../../src/ui/useAppState";
import Toast from "../../src/ui/Toast";

const DOW = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const DOW_FULL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

export default function CalendarPage() {
  const { st, ready, toastMsg } = useAppState();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });

  if (!ready || !st) return <Toast msg={toastMsg} />;

  const t = new Date();
  const { y, m } = ym;
  const isFuture = new Date(y, m, 1) > new Date(t.getFullYear(), t.getMonth(), 1);
  const pays = monthPayments(st.obligations, st.journal, y, m, t);
  const tot = monthTotals(pays);

  const first = new Date(y, m, 1);
  const dow = (first.getDay() + 6) % 7; // пн=0
  const dim = daysInMonth(y, m);
  const byDay = new Map<number, MonthPayment[]>();
  for (const p of pays) {
    const d = p.date.getDate();
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }
  const shift = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  let lastDay = -1;

  return (
    <>
      <h1>Календарь</h1>
      <div className="cal-head">
        <button className="mini" onClick={() => shift(-1)}>‹</button>
        <span className="m">{MONTH_RU[m]} {y}</span>
        <button className="mini" onClick={() => shift(1)}>›</button>
      </div>
      <div className="card">
        <div className="row"><span className="k">Платежи за месяц</span><b className="num">{fmtKop(tot.sum)}</b></div>
        <div className="hr" />
        <div className="row"><span className="mut sm">Оплачено {tot.paidN} из {tot.count} · {fmtKop(tot.paidSum)}</span></div>
        <div className="row" style={{ marginTop: 6 }}><span className="mut sm">Осталось оплатить</span><b className="num">{fmtKop(tot.remainSum)}</b></div>
      </div>
      {isFuture && <div className="ok-note">Это прогноз по периодичности платежей.</div>}
      <div className="cal-grid">
        {DOW.map(d => <div className="dow" key={d}>{d}</div>)}
        {Array.from({ length: dow }, (_, i) => <div className="d out" key={"o" + i} />)}
        {Array.from({ length: dim }, (_, i) => {
          const d = i + 1;
          const ps = byDay.get(d);
          let cls = "d" + (ps ? " pay" : "");
          let dot = "";
          if (ps) {
            const s = ps[0]!.status;
            if (s === "paid") { cls += " paid"; dot = "p"; }
            else if (s === "missed") { cls += " miss"; dot = "m"; }
            else dot = "u";
          }
          return <div className={cls} key={d}>{d}{dot ? <span className={"dot " + dot} /> : null}</div>;
        })}
      </div>

      {pays.map(p => {
        const dd = p.date.getDate();
        const head = dd !== lastDay;
        lastDay = dd;
        const wd = p.date.getDay() === 0 ? 6 : p.date.getDay() - 1;
        return (
          <div key={p.ob.id}>
            {head && <div className="k daygrp" style={{ marginTop: 18 }}>{dd} {MONTH_RU_G[m]}, {DOW_FULL[wd]}</div>}
            <div className="card row">
              <Link href={"/item/" + p.ob.id} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
                <b>{p.ob.name}</b><br /><span className="mut sm">{p.ob.category}</span>
              </Link>
              <div style={{ textAlign: "right" }}>
                <b className="num">{fmtKop(p.amountKop)}</b><br />
                {p.status === "paid" ? <span className="badge b-ok">Оплачен</span>
                  : p.status === "missed" ? <span className="badge b-red">Пропущен</span>
                    : <span className="badge b-mut">Предстоящий</span>}
              </div>
            </div>
          </div>
        );
      })}
      {pays.length === 0 && <div className="card empty"><div className="e">В этом месяце платежей нет</div></div>}
      <Toast msg={toastMsg} />
    </>
  );
}
