"use client";

import Link from "next/link";
import { fmtKop, loadPercent, monthPayments, monthTotals, MONTH_RU } from "../../src/domain";
import { categoryShares, paidByMonth } from "../../src/store";
import { useAppState } from "../../src/ui/useAppState";
import Toast from "../../src/ui/Toast";

export default function AnalyticsPage() {
  const { st, ready, toastMsg } = useAppState();

  if (!ready || !st) return <Toast msg={toastMsg} />;

  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  const pays = monthPayments(st.obligations, st.journal, y, m, t);
  const tot = monthTotals(pays);
  const load = loadPercent(pays, st.incomeKop);
  const shares = categoryShares(pays);
  const months = paidByMonth(st.journal, y, m);

  return (
    <>
      <h1>Аналитика</h1>

      <div className="card">
        <div className="k">Финансовая нагрузка</div>
        {load === null ? (
          <p className="mut sm" style={{ marginTop: 6 }}>Доход не указан — нагрузку посчитать нельзя. Укажите доход на <Link href="/">главной</Link>.</p>
        ) : (
          <>
            <div className="big num" style={{ marginTop: 4 }}>{load}%</div>
            <div className="loadbar"><i style={{ width: Math.min(100, load), background: load > 60 ? "#B9770E" : undefined }} /></div>
            <p className="mut sm">{fmtKop(tot.sum)} платежей к доходу {fmtKop(st.incomeKop ?? 0)}.</p>
          </>
        )}
      </div>

      <h2>Платежи по категориям</h2>
      <div className="card">
        {shares.map(s => (
          <div key={s.category}>
            <div className="row sm"><span>{s.category}</span><b className="num">{fmtKop(s.amountKop)} · {s.pct}%</b></div>
            <div className="bar"><i style={{ width: s.pct }} /></div>
          </div>
        ))}
        {shares.length === 0 && <p className="mut sm">В этом месяце платежей нет.</p>}
      </div>

      <h2>Выплачено за 3 месяца</h2>
      <div className="card">
        {months.map(mo => (
          <div className="jrow" key={mo.label}>
            <span>{mo.label}<br /><span className="mut sm">{mo.count} отметок оплат</span></span>
            <b className="num">{fmtKop(mo.amountKop)}</b>
          </div>
        ))}
      </div>
      <Toast msg={toastMsg} />
    </>
  );
}
