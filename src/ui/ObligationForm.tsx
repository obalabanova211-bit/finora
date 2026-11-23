"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseRubToKop, type Obligation } from "../domain";
import { addObligation, updateObligation } from "../store";
import { useAppState } from "./useAppState";

export const CATS = ["Потребительский кредит", "Ипотека", "Автокредит", "Кредитная карта", "Микрозайм", "Рассрочка", "Частный займ", "Аренда", "Коммунальные платежи", "Подписки", "Алименты и выплаты", "Другое"];

function kopToInput(kop: number | null): string {
  if (kop === null) return "";
  return String(kop / 100);
}
function sotToInput(sot: number | null): string {
  if (sot === null) return "";
  return String(sot / 100);
}
function parseRateToSot(s: string): number | null {
  if (s.trim() === "") return null;
  const n = parseFloat(s.replace(",", "."));
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function ObligationForm({ ob }: { ob?: Obligation }) {
  const router = useRouter();
  const { st, apply, toast } = useAppState();
  const editing = !!ob;

  const [name, setName] = useState(ob?.name ?? "");
  const [cat, setCat] = useState(ob?.category ?? "");
  const [pay, setPay] = useState(kopToInput(ob?.payKop ?? null));
  const [day, setDay] = useState(ob && !ob.event ? String(ob.day) : "");
  const [bal, setBal] = useState(kopToInput(ob?.balanceKop ?? null));
  const [rate, setRate] = useState(sotToInput(ob?.rateSot ?? null));
  const [endM, setEndM] = useState(ob?.endMonth ?? "");
  const [isEv, setIsEv] = useState(!!ob?.event);
  const [evt, setEvt] = useState(ob?.event ?? "");
  const [rec, setRec] = useState(ob?.recipient ?? "");
  const [note, setNote] = useState(ob?.note ?? "");
  const [errors, setErrors] = useState<{ name?: string; cat?: string; pay?: string; day?: string }>({});

  const save = () => {
    if (!st) return;
    const payKop = parseRubToKop(pay);
    const dayN = parseInt(day, 10);
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Дайте название — так вы узнаете платёж в списке";
    if (!cat) e.cat = "Выберите категорию из списка";
    if (!(isEv || (payKop !== null && payKop > 0))) e.pay = "Напишите сумму платежа — например, 11000";
    if (!(isEv || (dayN >= 1 && dayN <= 31))) e.day = "Число от 1 до 31";
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Проверьте выделенные поля");
      return;
    }
    const draft = {
      name: name.trim(),
      category: cat,
      payKop: isEv ? null : payKop!,
      day: isEv ? 1 : dayN,
      balanceKop: bal.trim() === "" ? null : parseRubToKop(bal),
      rateSot: parseRateToSot(rate),
      endMonth: endM || null,
      event: isEv ? (evt.trim() || "") : null,
      recipient: rec.trim(),
      note: note.trim(),
      status: ob?.status ?? ("active" as const),
    };
    let nextId: number;
    if (editing && ob) {
      apply(updateObligation(st, ob.id, draft));
      nextId = ob.id;
    } else {
      const next = addObligation(st, draft);
      apply(next);
      nextId = next.obligations[next.obligations.length - 1]!.id;
    }
    toast("Сохранено");
    router.push("/item?id=" + nextId);
  };

  return (
    <>
      <h1>{editing ? "Изменить обязательство" : "Новое обязательство"}</h1>
      <div className="card">
        <label className="f">Название</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например: Кредитная карта" />
        <div className="err">{errors.name}</div>

        <label className="f">Категория</label>
        <select value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">Выберите категорию</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="err">{errors.cat}</div>

        <label className="f">Сумма платежа, ₽ в месяц</label>
        <input type="number" min={1} step="any" value={pay} onChange={e => setPay(e.target.value)} disabled={isEv} placeholder="Например: 11 000" />
        <div className="err">{errors.pay}</div>

        <label className="f">День платежа</label>
        <input type="number" min={1} max={31} value={day} onChange={e => setDay(e.target.value)} disabled={isEv} placeholder="От 1 до 31" />
        <div className="err">{errors.day}</div>

        <details>
          <summary>Подробнее (необязательно)</summary>
          <label className="f">Остаток обязательства, ₽ — оставьте пустым для регулярного платежа (аренда, подписка)</label>
          <input type="number" min={0} step="any" value={bal} onChange={e => setBal(e.target.value)} />

          <label className="f">Когда возвращать</label>
          <select value={isEv ? "event" : ""} onChange={e => setIsEv(e.target.value === "event")}>
            <option value="">По графику — обычные платежи (по умолчанию)</option>
            <option value="event">По событию — вернуть, когда случится (залог, возврат человеку)</option>
          </select>

          {isEv && (
            <>
              <label className="f">Какое событие (можно оставить пустым)</label>
              <input type="text" value={evt} onChange={e => setEvt(e.target.value)} placeholder="Например: съедут арендаторы" />
            </>
          )}

          <label className="f">Ставка, % в год (не знаете — оставьте пустым)</label>
          <input type="number" min={0} step="any" value={rate} onChange={e => setRate(e.target.value)} />

          <label className="f">Дата окончания, если известна (из приложения банка)</label>
          <input type="month" value={endM} onChange={e => setEndM(e.target.value)} />

          <label className="f">Получатель</label>
          <input type="text" value={rec} onChange={e => setRec(e.target.value)} placeholder="Банк, человек или организация" />

          <label className="f">Заметка</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} />
        </details>

        <button className="btn" onClick={save}>Сохранить</button>
        <button className="btn ghost" onClick={() => router.back()}>Отмена</button>
      </div>
      <p className="mut sm" style={{ marginTop: 10 }}>Если в месяце нет такой даты (например, 31-го в феврале), платёж переносится на последний день месяца.</p>
    </>
  );
}
