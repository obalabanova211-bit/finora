"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  effRate, endAtTempt, endHuman, fmtKop, isEvent, isPaidIn, monthsToEnd,
  nextPayDate, payDateFor, simulateClose, MONTH_RU, MONTH_RU_G,
  type Obligation,
} from "../../../src/domain";
import { closeObligation, deleteObligation, undoPayment } from "../../../src/store";
import { useAppState } from "../../../src/ui/useAppState";
import Toast from "../../../src/ui/Toast";
import PayModal from "../../../src/ui/PayModal";
import CalcModal from "../../../src/ui/CalcModal";
import Confirm from "../../../src/ui/Confirm";

function dHuman(d: Date): string {
  return d.getDate() + " " + MONTH_RU_G[d.getMonth()];
}

export default function ItemPage() {
  const { st, ready, apply, toastMsg, toast } = useAppState();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [confirm, setConfirm] = useState<"close" | "del" | null>(null);

  if (!ready || !st) return <Toast msg={toastMsg} />;
  const ob: Obligation | undefined = st.obligations.find(o => o.id === Number(params.id));
  if (!ob) {
    return (
      <>
        <p className="mut">Обязательство не найдено.</p>
        <button className="btn ghost" onClick={() => router.push("/obligations")}>К списку</button>
        <Toast msg={toastMsg} />
      </>
    );
  }

  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  const pj = isPaidIn(ob, st.journal, y, m);
  const miss = !!(ob.payKop && !pj && payDateFor(ob.day, y, m) < t);
  const hist = st.journal.filter(j => j.obId === ob.id).sort((a, b) => b.id - a.id).slice(0, 5);
  const er = effRate(ob);
  const ev = isEvent(ob);

  return (
    <>
      <h1>{ob.name}</h1>
      <p className="mut sm" style={{ margin: "-8px 0 10px" }}>{ob.category}{ob.recipient ? " · " + ob.recipient : ""}</p>

      <div className="card">
        {ob.status === "active" && !ev && (
          <p className="mut sm" style={{ marginBottom: 10 }}>
            Следующий платёж: <b>{dHuman(nextPayDate(ob))}</b>{pj ? " · за " + MONTH_RU[m] + " оплачен" : ""}
          </p>
        )}
        {ob.balanceKop !== null ? (
          <>
            <div className="k">Осталось оплатить</div>
            <div className="big num">{fmtKop(ob.balanceKop)}</div>
            <div className="hr" />
          </>
        ) : ob.status === "active" ? (
          <>
            <div className="k">Регулярный платёж</div>
            <div className="big num">{fmtKop(ob.payKop ?? 0)}</div>
            <div className="mut sm">каждый месяц, {ob.day}-го числа · без конечного остатка</div>
            <div className="hr" />
          </>
        ) : null}

        <div className="row stat">
          <div>
            {ev ? (
              <>
                <div className="v">Вернуть по событию</div>
                <div className="k">{ob.event || "когда случится"}</div>
              </>
            ) : (
              <>
                <div className="v num">{fmtKop(ob.payKop ?? 0)}</div>
                <div className="k">Платёж · {ob.day}-е число</div>
              </>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            {er
              ? <><div className="v num">{er.rateSot / 100}%</div><div className="k">{er.est ? "в год · оценка" : "в год"}</div></>
              : <div className="mut sm">Без ставки</div>}
          </div>
        </div>

        {ob.status === "active" && ob.endMonth && ob.balanceKop !== null && (
          <>
            <div className="hr" />
            <div className="row"><span className="mut sm">По графику банка</span><span>{endHuman(ob.endMonth)}</span></div>
            {(() => {
              const nn = monthsToEnd(ob.endMonth);
              if (!er && nn > 0 && ob.payKop && nn < Math.ceil(ob.balanceKop! / ob.payKop)) {
                return <div className="mut sm" style={{ marginTop: 4 }}>Проверьте дату окончания или платёж: даже без процентов к этой дате не закрыть.</div>;
              }
              if (er && ob.payKop) {
                const sim = simulateClose(ob.balanceKop!, er.rateSot, ob.payKop);
                const rows = [
                  sim ? <div className="row" key="t"><span className="mut sm">По вашему темпу</span><span>{endAtTempt(ob, sim.months)}</span></div> : null,
                  er.est
                    ? <div className="mut sm" key="e" style={{ marginTop: 4 }}>Ставка оценена по графику банка: примерно {er.rateSot / 100}% в год</div>
                    : null,
                ];
                return rows;
              }
              return null;
            })()}
          </>
        )}
      </div>

      {ob.note ? <p className="mut sm" style={{ margin: "0 0 6px" }}>{ob.note}</p> : null}

      {ob.status === "active" && (
        <>
          {pj
            ? <div className="ok-note">Платёж за {MONTH_RU[m]} оплачен{pj.est ? " (оценка списания)" : ""}</div>
            : miss ? <div className="red-note">Платёж {ob.day}-го числа пропущен. Отметьте оплату, если уже заплатили.</div> : null}
          <button className="btn" onClick={() => setPayOpen(true)}>Отметить оплату</button>
          {ob.balanceKop !== null && !ev && <button className="btn ghost" onClick={() => setCalcOpen(true)}>А если платить больше?</button>}
        </>
      )}
      <button className="btn ghost" onClick={() => router.push("/edit/" + ob.id)}>Изменить</button>
      {ob.status === "active" && <button className="btn ghost" onClick={() => setConfirm("close")}>Закрыть обязательство</button>}
      <button className="btn danger" onClick={() => setConfirm("del")}>Удалить</button>

      {hist.length > 0 && (
        <>
          <h2>История оплат</h2>
          <div className="card">
            {hist.map(j => {
              const p = j.date.split("-");
              return (
                <div className="jrow" key={j.id}>
                  <span>
                    <b className="num">{fmtKop(j.amountKop)}</b>
                    {j.est && j.bodyKop ? <> <span className="mut sm">(в остаток пошло ~{fmtKop(j.bodyKop)})</span></> : null}
                    <br />
                    <span className="mut sm">{parseInt(p[2]!, 10)} {MONTH_RU_G[parseInt(p[1]!, 10) - 1]} {p[0]}</span>
                  </span>
                  <button className="linkbtn" onClick={() => { apply(undoPayment(st, j.id)); toast("Оплата отменена, остаток восстановлен"); }}>Отменить</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {payOpen && <PayModal st={st} ob={ob} apply={apply} toast={toast} onClose={() => setPayOpen(false)} />}
      {calcOpen && <CalcModal ob={ob} onClose={() => setCalcOpen(false)} />}
      {confirm === "close" && (
        <Confirm
          title="Закрыть обязательство?"
          text={"«" + ob.name + "» уйдёт в закрытые. История оплат сохранится."}
          yesLabel="Закрыть"
          onYes={() => { apply(closeObligation(st, ob.id)); setConfirm(null); toast("Обязательство закрыто"); }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "del" && (
        <Confirm
          title="Удалить обязательство?"
          text={"«" + ob.name + "» и его история оплат будут удалены безвозвратно."}
          yesLabel="Удалить"
          onYes={() => { apply(deleteObligation(st, ob.id)); toast("Удалено"); router.push("/obligations"); }}
          onClose={() => setConfirm(null)}
        />
      )}
      <Toast msg={toastMsg} />
    </>
  );
}
