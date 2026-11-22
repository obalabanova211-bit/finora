/* Слой состояния модуля «Обязательства»: чистые функции над AppState.
   Не знает про React и браузер: UI вызывает их и получает новое состояние. */

import {
  type Obligation, type JournalEntry, type EffectiveRate, type MonthPayment,
  splitPayment, effRate, isEvent, nextPayDate, monthPayments, monthKey,
} from "./domain";

export interface AppState {
  v: 1;
  welcomed: boolean;
  incomeKop: number | null;
  lastBackup: string | null;
  seq: number;
  obligations: Obligation[];
  journal: JournalEntry[];
}

export function emptyState(): AppState {
  return { v: 1, welcomed: false, incomeKop: null, lastBackup: null, seq: 1, obligations: [], journal: [] };
}

export type ObligationDraft = Omit<Obligation, "id">;

export function addObligation(st: AppState, draft: ObligationDraft): AppState {
  const ob: Obligation = { ...draft, id: st.seq };
  return {
    ...st,
    seq: st.seq + 1,
    obligations: [...st.obligations, ob],
    welcomed: true,
  };
}

export function updateObligation(st: AppState, id: number, patch: Partial<ObligationDraft>): AppState {
  return {
    ...st,
    obligations: st.obligations.map(o => (o.id === id ? { ...o, ...patch } : o)),
  };
}

export function deleteObligation(st: AppState, id: number): AppState {
  return {
    ...st,
    obligations: st.obligations.filter(o => o.id !== id),
    journal: st.journal.filter(j => j.obId !== id),
  };
}

export function closeObligation(st: AppState, id: number): AppState {
  return updateObligation(st, id, { status: "closed", balanceKop: 0 });
}

/* ---------- оплата ---------- */

export interface PaymentOptions {
  /** учесть платёж в остатке (оценкой «сначала проценты») */
  useAuto: boolean;
  /** точный остаток из приложения банка: главнее оценки */
  exactBalanceKop?: number | null;
}

export interface PaymentResult {
  state: AppState;
  obId: number;
  journalId: number;
  /** сколько пошло в остаток */
  bodyKop: number;
  interestKop: number;
  /** расклад — оценка по ставке */
  est: boolean;
  closedNow: boolean;
}

export function recordPayment(
  st: AppState,
  obId: number,
  amountKop: number,
  opts: PaymentOptions,
  today: Date,
  dateStr?: string,
): PaymentResult {
  const ob = st.obligations.find(o => o.id === obId);
  if (!ob) throw new Error("обязательство не найдено: " + obId);
  if (!(amountKop > 0)) throw new Error("сумма должна быть больше нуля");

  let bodyKop = 0;
  let interestKop = 0;
  let est = false;
  let newBalance = ob.balanceKop;

  if (ob.balanceKop !== null && opts.exactBalanceKop != null && opts.exactBalanceKop >= 0) {
    // точный остаток из приложения банка всегда главнее оценки
    bodyKop = Math.max(0, ob.balanceKop - opts.exactBalanceKop);
    newBalance = opts.exactBalanceKop;
  } else if (ob.balanceKop !== null && opts.useAuto) {
    const r = splitFor(ob, amountKop, today);
    bodyKop = r.bodyKop;
    interestKop = r.interestKop;
    est = r.est;
    newBalance = Math.max(0, ob.balanceKop - bodyKop);
  }

  const closedNow = ob.status === "active" && ob.balanceKop !== null && newBalance !== null && newBalance <= 0;
  const journalId = st.seq;
  const d = dateStr ?? isoDate(today);
  const entry: JournalEntry = { id: journalId, obId, date: d, amountKop, bodyKop, est };

  const state: AppState = {
    ...st,
    seq: st.seq + 1,
    obligations: st.obligations.map(o =>
      o.id === obId ? { ...o, balanceKop: newBalance, status: closedNow ? ("closed" as const) : o.status } : o,
    ),
    journal: [...st.journal, entry],
  };
  return { state, obId, journalId, bodyKop, interestKop, est, closedNow };
}

function splitFor(ob: Obligation, amountKop: number, today: Date): { bodyKop: number; interestKop: number; est: boolean } {
  if (ob.balanceKop === null || ob.balanceKop <= 0) return { bodyKop: 0, interestKop: 0, est: false };
  const er: EffectiveRate | null = effRate(ob, today); // явная или оценённая по графику
  if (!er) return { bodyKop: amountKop, interestKop: 0, est: false };
  const r = splitPayment(ob.balanceKop, er.rateSot, amountKop);
  return { bodyKop: Math.max(0, r.bodyKop), interestKop: r.interestKop, est: true };
}

export function undoPayment(st: AppState, journalId: number): AppState {
  const j = st.journal.find(e => e.id === journalId);
  if (!j) return st;
  return {
    ...st,
    obligations: st.obligations.map(o =>
      o.id === j.obId && o.balanceKop !== null
        ? { ...o, balanceKop: o.balanceKop + (j.bodyKop ?? 0), status: "active" as const }
        : o,
    ),
    journal: st.journal.filter(e => e.id !== journalId),
  };
}

function isoDate(d: Date): string {
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/* ---------- список с секциями ---------- */

export interface ListSections {
  credits: Obligation[];   // с остатком (кредиты, рассрочки)
  regular: Obligation[];   // регулярный платёж без остатка
  events: Obligation[];    // вернуть по событию
  closed: Obligation[];
}

function byCreditor(a: Obligation, b: Obligation): number {
  const ra = a.recipient || a.category;
  const rb = b.recipient || b.category;
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return 0;
}

export function listSections(st: AppState): ListSections {
  const act = st.obligations.filter(o => o.status === "active");
  return {
    credits: act.filter(o => o.balanceKop !== null && !isEvent(o)).sort(byCreditor),
    regular: act.filter(o => o.balanceKop === null && !isEvent(o)).sort(byCreditor),
    events: act.filter(o => isEvent(o)).sort(byCreditor),
    closed: st.obligations.filter(o => o.status === "closed").sort(byCreditor),
  };
}

export interface SectionTotals {
  /** остатки кредитов и рассрочек (без «по событию») */
  balanceCredits: number;
  /** сумма обязательств: кредиты, рассрочки и «вернуть по событию» */
  balanceTotal: number;
  payCredits: number;
  payRegular: number;
  payTotal: number;
}

export function sectionTotals(s: ListSections): SectionTotals {
  let balanceCredits = 0, balanceTotal = 0, payCredits = 0, payRegular = 0;
  for (const o of s.credits) {
    balanceCredits += o.balanceKop ?? 0;
    payCredits += o.payKop ?? 0;
  }
  for (const o of s.regular) payRegular += o.payKop ?? 0;
  for (const o of s.events) balanceTotal += o.balanceKop ?? 0;
  return { balanceCredits, balanceTotal: balanceTotal + balanceCredits, payCredits, payRegular, payTotal: payCredits + payRegular };
}

/* ---------- аналитика ---------- */

export interface CategoryShare {
  category: string;
  amountKop: number;
  pct: number;
}

export function categoryShares(pays: MonthPayment[]): CategoryShare[] {
  // доли платежей месяца по категориям; округление вниз, остаток до ровно 100% —
  // категориям с наибольшей дробной частью (по одной единице)
  const amounts = new Map<string, number>();
  let sum = 0;
  for (const p of pays) {
    amounts.set(p.ob.category, (amounts.get(p.ob.category) ?? 0) + p.amountKop);
    sum += p.amountKop;
  }
  const out: (CategoryShare & { exact: number })[] = [];
  for (const [category, amountKop] of amounts) {
    const exact = sum > 0 ? (amountKop / sum) * 100 : 0;
    out.push({ category, amountKop, exact, pct: Math.floor(exact) });
  }
  let left = 100 - out.reduce((s, c) => s + c.pct, 0);
  const byFrac = [...out].sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct));
  for (let i = 0; left > 0 && out.length > 0; i = (i + 1) % out.length) {
    byFrac[i]!.pct += 1;
    left -= 1;
  }
  return out.map(({ category, amountKop, pct }) => ({ category, amountKop, pct }));
}

export interface MonthPaid {
  label: string;
  amountKop: number;
  count: number;
}

export function paidByMonth(journal: JournalEntry[], y: number, mIdx: number, count = 3): MonthPaid[] {
  // сколько отмечено оплаченным за последние `count` месяцев, включая текущий
  const out: MonthPaid[] = [];
  for (let k = count - 1; k >= 0; k--) {
    const d = new Date(y, mIdx - k, 1);
    const key = monthKey(d.getFullYear(), d.getMonth());
    let amountKop = 0, n = 0;
    for (const j of journal) {
      if (j.date.slice(0, 7) === key) { amountKop += j.amountKop; n++; }
    }
    out.push({ label: MONTH_LABELS[d.getMonth()] + " " + d.getFullYear(), amountKop, count: n });
  }
  return out;
}

const MONTH_LABELS = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];

/* ---------- представления для карточки ---------- */

export function obMissed(st: AppState, ob: Obligation, today: Date): boolean {
  if (ob.status !== "active" || !ob.payKop) return false;
  const pays = monthPayments([ob], st.journal, today.getFullYear(), today.getMonth(), today);
  return pays.length === 1 && pays[0]!.status === "missed";
}

export function obNextPayLabel(ob: Obligation, today: Date): string | null {
  if (ob.status !== "active" || !ob.payKop) return null;
  const d = nextPayDate(ob, today);
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  return d.getDate() + " " + months[d.getMonth()];
}
