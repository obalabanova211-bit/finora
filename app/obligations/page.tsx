"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtKop, MONTH_RU_G, isEvent, isPaidIn, nextPayDate, payDateFor } from "../../src/domain";
import { listSections, sectionTotals } from "../../src/store";
import type { Obligation } from "../../src/domain";
import { useAppState } from "../../src/ui/useAppState";
import Toast from "../../src/ui/Toast";

type Tab = "all" | "active" | "miss" | "closed";

function dHuman(d: Date): string {
  return d.getDate() + " " + MONTH_RU_G[d.getMonth()];
}

function ObCard({ o, missed }: { o: Obligation; missed: boolean }) {
  const isA = o.balanceKop !== null;
  let sub: string;
  let right: React.ReactNode;
  if (o.status !== "closed") {
    if (isEvent(o)) {
      sub = "вернуть по событию" + (o.event ? " · " + o.event : "");
      right = <>
        <div className="num" style={{ fontWeight: 800 }}>{fmtKop(o.balanceKop ?? 0)}</div>
        <div className="mut sm">вернуть</div>
      </>;
    } else if (isA) {
      sub = "ежемесячно " + fmtKop(o.payKop ?? 0) + " · следующий " + dHuman(nextPayDate(o));
      right = <>
        <div className="num" style={{ fontWeight: 800 }}>{fmtKop(o.balanceKop ?? 0)}</div>
        <div className="mut sm">осталось оплатить</div>
      </>;
    } else {
      sub = "регулярный платёж · следующий " + dHuman(nextPayDate(o));
      right = <>
        <div className="num" style={{ fontWeight: 800 }}>{fmtKop(o.payKop ?? 0)}</div>
        <div className="mut sm">каждый месяц</div>
      </>;
    }
  } else {
    sub = "ежемесячно " + fmtKop(o.payKop ?? 0) + ", " + o.day + "-го числа";
    right = null;
  }
  return (
    <div className="card">
      <div className="row">
        <Link href={"/item?id=" + o.id} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
          <b>{o.name}</b><br />
          <span className="mut sm">{o.category}{o.recipient ? " · " + o.recipient : ""} · {sub}</span>
        </Link>
        <div style={{ textAlign: "right" }}>
          {right}
          {o.status === "closed"
            ? <span className="badge b-mut">Закрыто</span>
            : missed ? <span className="badge b-red">Пропущен платёж</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function ListPage() {
  const { st, ready, loadDemo, toastMsg, toast } = useAppState();
  const [tab, setTab] = useState<Tab>("all");

  if (!ready || !st) return <Toast msg={toastMsg} />;

  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  const missedOf = (o: Obligation) =>
    !!(o.status === "active" && o.payKop && !isPaidIn(o, st.journal, y, m) && payDateFor(o.day, y, m) < t);

  const secs = listSections(st);
  const miss = [...secs.credits, ...secs.regular].filter(missedOf);
  const totals = sectionTotals(secs);
  const empty = st.obligations.length === 0;

  const TABS: [Tab, string][] = [["all", "Все"], ["active", "Активные"], ["miss", "Пропущенные"], ["closed", "Закрытые"]];
  const showTotals = tab === "all" || tab === "active";
  const hasActive = secs.credits.length + secs.regular.length + secs.events.length > 0;

  const section = (title: string, arr: Obligation[]) => arr.length ? (
    <>
      <div className="k" style={{ margin: "18px 0 2px" }}>{title} · {arr.length}</div>
      {arr.map(o => <ObCard key={o.id} o={o} missed={missedOf(o)} />)}
    </>
  ) : null;

  let body: React.ReactNode = null;
  if (tab === "all") body = <>{section("Кредиты и рассрочки", secs.credits)}{section("Регулярные платежи", secs.regular)}{section("Вернуть по событию", secs.events)}{section("Закрытые", secs.closed)}</>;
  else if (tab === "active") body = <>{section("Кредиты и рассрочки", secs.credits)}{section("Регулярные платежи", secs.regular)}{section("Вернуть по событию", secs.events)}</>;
  else if (tab === "miss") body = section("С пропущенным платежом", miss);
  else body = section("Закрытые", secs.closed);

  return (
    <>
      <h1>Обязательства</h1>
      {empty ? (
        <div className="card empty">
          <div className="e">Здесь пока пусто. Добавьте первое обязательство — или посмотрите, как всё устроено, на примере.</div>
          <Link href="/add" className="mini" style={{ display: "inline-block", textDecoration: "none" }}>Добавить обязательство</Link>{" "}
          <button className="mini" onClick={() => { loadDemo(); toast("Загружен пример — очистить его можно будет в настройках"); }}>Показать на примере</button>
        </div>
      ) : (
        <>
          <div className="tabs">
            {TABS.map(([key, label]) => (
              <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          {showTotals && hasActive && (
            <div className="card">
              {secs.credits.length > 0 && <>
                <div className="row"><span className="mut sm">Осталось оплатить по кредитам и рассрочкам</span><b className="num">{fmtKop(totals.balanceCredits)}</b></div>
                <div className="hr" />
                <div className="row"><span className="mut sm">Кредиты и рассрочки, платежи в месяц</span><b className="num">{fmtKop(totals.payCredits)}</b></div>
              </>}
              {secs.regular.length > 0 && <div className="row" style={{ marginTop: 6 }}><span className="mut sm">Регулярные платежи, в месяц</span><b className="num">{fmtKop(totals.payRegular)}</b></div>}
              <div className="row" style={{ marginTop: 6 }}><span className="mut sm">Всего в месяц</span><b className="num">{fmtKop(totals.payTotal)}</b></div>
            </div>
          )}
          {body}
        </>
      )}
      <Link href="/add" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 18 }}>+ Добавить обязательство</Link>
      <Toast msg={toastMsg} />
    </>
  );
}
