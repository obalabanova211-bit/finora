"use client";

import { useState } from "react";
import { effRate, simulateClose, fmtKop, MONTH_RU_G, type Obligation } from "../domain";

function monthLab(months: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth() + months, 1);
  return MONTH_RU_G[d.getMonth()] + " " + d.getFullYear();
}

export default function CalcModal({ ob, onClose }: { ob: Obligation; onClose: () => void }) {
  const er = effRate(ob);
  const [payStr, setPayStr] = useState(ob.payKop !== null ? String(ob.payKop / 100) : "");

  const balance = ob.balanceKop ?? 0;
  const curPay = ob.payKop ?? 0;
  const cur = simulateClose(balance, er ? er.rateSot : 0, curPay);
  const altPay = Math.round((parseFloat(payStr.replace(",", ".")) || 0) * 100);
  const alt = altPay > 0 ? simulateClose(balance, er ? er.rateSot : 0, altPay) : null;
  const interestPerMonth = Math.round((balance * (er ? er.rateSot : 0)) / 120000);

  return (
    <div className="mask" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>А если платить больше?</h3>
        <p className="mut sm">«{ob.name}» · осталось {fmtKop(balance)}
          {er ? " · ставка " + (er.rateSot / 100) + "%" + (er.est ? " (оценка по графику)" : "") : " · ставка не указана"}</p>
        <label className="f">Платёж в месяц, ₽</label>
        <input type="number" min={1} step="any" value={payStr} onChange={e => setPayStr(e.target.value)} />
        <div style={{ marginTop: 12 }}>
          {cur ? (
            <div className="jrow">
              <span>Сейчас, {fmtKop(curPay)}/мес</span>
              <span className="mut sm">{monthLab(cur.months)} · проценты всего {fmtKop(cur.interestKop)}</span>
            </div>
          ) : (
            <div className="red-note">Текущий платёж не покрывает проценты за месяц — само по себе обязательство не закроется.</div>
          )}
          {altPay > 0 && altPay !== curPay && (
            alt ? (
              <>
                <div className="jrow">
                  <span><b>Если {fmtKop(altPay)}/мес</b></span>
                  <span><b>{monthLab(alt.months)}</b> · проценты {fmtKop(alt.interestKop)}</span>
                </div>
                {cur && (
                  <div className="ok-note">
                    {cur.interestKop - alt.interestKop > 100
                      ? <>Экономия на процентах: <b>{fmtKop(cur.interestKop - alt.interestKop)}</b>{cur.months - alt.months > 0 ? " и закроется на " + (cur.months - alt.months) + " мес. раньше" : ""}.</>
                      : cur.months - alt.months > 0
                        ? <>Закроется на {cur.months - alt.months} мес. раньше.</>
                        : <>Разницы почти нет.</>}
                  </div>
                )}
              </>
            ) : (
              <div className="red-note">Платёж меньше процентов за месяц ({fmtKop(interestPerMonth)}) — так не закрыть.</div>
            )
          )}
          <p className="mut sm">Оценка{er
            ? " по ставке " + (er.rateSot / 100) + "%" + (er.est ? " (оценена по графику банка)" : "") + " — банк может считать чуть иначе"
            : " без ставки; для точности укажите ставку или дату окончания в карточке"}.</p>
        </div>
        <button className="btn" onClick={onClose}>Понятно</button>
      </div>
    </div>
  );
}
