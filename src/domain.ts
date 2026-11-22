/* ====================================================================
   Finora — доменная логика.
   Правила:
   - деньги — ТОЛЬКО целые копейки: 24200000 = 242 000,00 ₽;
   - ставки — целые сотые доли процента в год: 3990 = 39,90%;
   - никаких float в денежных расчётах: рубли из интерфейса парсятся
     в копейки напрямую из строки (parseRubToKop);
   - модуль не знает про UI, браузер и хранение — только Math и Date;
   - слово «долг» не используется.
   ==================================================================== */

export interface Obligation {
  id: number;
  name: string;
  category: string;
  /** регулярный платёж; null — «вернуть по событию» */
  payKop: number | null;
  /** день платежа 1..31; при отсутствии даты в месяце — последний день месяца */
  day: number;
  /** остаток; null — регулярный платёж без конечного остатка */
  balanceKop: number | null;
  /** ставка, сотые доли процента в год; null — неизвестна */
  rateSot: number | null;
  /** дата окончания по графику банка, "YYYY-MM"; null — неизвестна */
  endMonth: string | null;
  /** непустая строка — обязательство «вернуть по событию» */
  event: string | null;
  status: "active" | "closed";
  recipient?: string;
  note?: string;
}

export interface JournalEntry {
  id: number;
  obId: number;
  date: string; // "YYYY-MM-DD"
  amountKop: number;
  bodyKop?: number;
  est?: boolean;
}

export interface MonthPayment {
  ob: Obligation;
  date: Date;
  amountKop: number;
  status: "paid" | "missed" | "upcoming";
  journal: JournalEntry | null;
}

export interface MonthTotals {
  count: number;
  sum: number;
  paidN: number;
  paidSum: number;
  remainSum: number;
  missN: number;
}

export interface PaymentSplit {
  interestKop: number;
  bodyKop: number;
  covers: boolean;
}

export interface AppliedPayment {
  newBalanceKop: number;
  interestKop: number;
  bodyKop: number;
  est: boolean;
}

export interface CloseSimulation {
  months: number;
  interestKop: number;
}

export type EffectiveRate = { rateSot: number; est: boolean };

export const MONTH_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"] as const;
export const MONTH_RU_G = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"] as const;

/* ---------- деньги ---------- */

export function parseRubToKop(s: string | null | undefined): number | null {
  // "242 000,55" -> 24200055; "17000" -> 1700000; "" -> null
  if (s === null || s === undefined) return null;
  const t = String(s).replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const neg = t.charAt(0) === "-";
  const body = neg ? t.slice(1) : t;
  const p = body.split(".");
  const rub = p[0] === "" ? 0 : parseInt(p[0]!, 10);
  if (isNaN(rub)) return null;
  let kop = 0;
  if (p.length > 1) {
    const fr = (p[1]! + "00").slice(0, 2); // максимум копейки
    kop = parseInt(fr, 10);
  }
  const v = rub * 100 + kop;
  return neg ? -v : v;
}

export function fmtKop(kop: number): string {
  // 24200000 -> "242 000 ₽" (показ с округлением до рубля)
  const neg = kop < 0 ? "-" : "";
  const rub = Math.round(Math.abs(kop) / 100);
  return neg + String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
}

export function fmtKopExact(kop: number): string {
  // 24200055 -> "242 000,55 ₽"
  const neg = kop < 0 ? "-" : "";
  const k = Math.abs(Math.round(kop));
  const rub = Math.floor(k / 100);
  const ck = k % 100;
  return neg + String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + (ck < 10 ? "0" : "") + ck + " ₽";
}

export function sumBalances(obligations: Obligation[]): number {
  // сумма остатков активных обязательств с остатком (включая «по событию»)
  let s = 0;
  for (const o of obligations) {
    if (o.status === "active" && o.balanceKop) s += o.balanceKop;
  }
  return s;
}

/* ---------- даты платежей ---------- */

export function daysInMonth(y: number, mIdx: number): number {
  return new Date(y, mIdx + 1, 0).getDate();
}

export function payDateFor(day: number, y: number, mIdx: number): Date {
  // правило конца месяца: 31-е в феврале -> 28/29-е
  return new Date(y, mIdx, Math.min(day, daysInMonth(y, mIdx)));
}

export function monthKey(y: number, mIdx: number): string {
  return y + "-" + (mIdx + 1 < 10 ? "0" : "") + (mIdx + 1);
}

export function nextPayDate(ob: Pick<Obligation, "day">, today?: Date): Date {
  const t0 = today ?? new Date();
  const t = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  let d = payDateFor(ob.day, t.getFullYear(), t.getMonth());
  if (d < t) d = payDateFor(ob.day, d.getFullYear(), d.getMonth() + 1);
  return d;
}

export function monthsToEnd(endMonth: string | null, today?: Date): number {
  // сколько полных месяцев от текущего месяца до "YYYY-MM"; 0 если нет или прошло
  if (!endMonth) return 0;
  const t = today ?? new Date();
  const p = endMonth.split("-");
  return (parseInt(p[0]!, 10) - t.getFullYear()) * 12 + (parseInt(p[1]!, 10) - 1 - t.getMonth());
}

export function endHuman(endMonth: string): string {
  const p = endMonth.split("-");
  return MONTH_RU[parseInt(p[1]!, 10) - 1] + " " + p[0];
}

export function isEvent(ob: Pick<Obligation, "event">): boolean {
  return ob.event !== null && ob.event !== undefined; // «вернуть по событию»
}

/* ---------- платежи месяца ---------- */

export function isPaidIn(ob: Pick<Obligation, "id">, journal: JournalEntry[], y: number, mIdx: number): JournalEntry | null {
  const key = monthKey(y, mIdx);
  for (const j of journal) {
    if (j.obId === ob.id && j.date.slice(0, 7) === key) return j;
  }
  return null;
}

export function monthPayments(obligations: Obligation[], journal: JournalEntry[], y: number, mIdx: number, today?: Date): MonthPayment[] {
  // только обычные обязательства: «по событию» (без платежа) и закрытые не участвуют
  const t0 = today ?? new Date();
  const t = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  const out: MonthPayment[] = [];
  for (const o of obligations) {
    if (o.status !== "active" || !o.payKop) continue;
    const d = payDateFor(o.day, y, mIdx);
    const pj = isPaidIn(o, journal, y, mIdx);
    const status: MonthPayment["status"] = pj ? "paid" : d < t ? "missed" : "upcoming";
    out.push({ ob: o, date: d, amountKop: o.payKop, status, journal: pj });
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

export function monthTotals(pays: MonthPayment[]): MonthTotals {
  let sum = 0, paidN = 0, paidSum = 0, remainSum = 0, missN = 0;
  for (const p of pays) {
    sum += p.amountKop;
    if (p.status === "paid") { paidN++; paidSum += p.amountKop; }
    else remainSum += p.amountKop;
    if (p.status === "missed") missN++;
  }
  return { count: pays.length, sum, paidN, paidSum, remainSum, missN };
}

/* ---------- финансовая нагрузка ---------- */

export function loadPercent(pays: MonthPayment[], incomeKop: number | null): number | null {
  // платежи месяца к доходу, целые проценты; null если доход не указан
  if (!incomeKop || incomeKop <= 0) return null;
  const tot = monthTotals(pays);
  return Math.round((tot.sum / incomeKop) * 100);
}

/* ---------- списание платежа: сначала проценты, потом тело ---------- */

export function interestForMonth(balanceKop: number, rateSot: number | null): number {
  // проценты за один месяц: остаток × ставка/12; сотые процента -> ещё /100
  if (!rateSot) return 0;
  return Math.round((balanceKop * rateSot) / 120000);
}

export function splitPayment(balanceKop: number, rateSot: number | null, payKop: number): PaymentSplit {
  const interestKop = interestForMonth(balanceKop, rateSot);
  const bodyKop = payKop - interestKop;
  return { interestKop, bodyKop, covers: bodyKop >= 0 };
}

export function applyPayment(ob: Pick<Obligation, "balanceKop" | "rateSot">, payKop: number): AppliedPayment {
  // вся история кредита зашита в текущем остатке
  const r = splitPayment(ob.balanceKop ?? 0, ob.rateSot, payKop);
  const bodyKop = Math.max(0, r.bodyKop);
  return {
    newBalanceKop: Math.max(0, (ob.balanceKop ?? 0) - bodyKop),
    interestKop: r.interestKop,
    bodyKop,
    est: !!ob.rateSot,
  };
}

/* ---------- симуляция закрытия (аннуитет) ---------- */

export function simulateClose(balanceKop: number, rateSot: number | null, payKop: number): CloseSimulation | null {
  // сколько месяцев закроется и сколько всего процентов; null если платёж не покрывает проценты
  if (!(payKop > 0) || balanceKop <= 0) return null;
  let b = balanceKop, months = 0, interest = 0;
  while (b > 0 && months < 600) {
    const int = interestForMonth(b, rateSot);
    if (payKop <= int) return null;
    interest += int;
    b -= payKop - int;
    months++;
  }
  return { months, interestKop: interest };
}

export function endAtTempt(ob: Pick<Obligation, "day" | "payKop">, months: number): string {
  // месяц последнего платежа: от ближайшей даты платежа, а не от «сегодня»
  const d0 = ob.payKop ? nextPayDate(ob) : new Date();
  const d = payDateFor(ob.day, d0.getFullYear(), d0.getMonth() + months - 1);
  return MONTH_RU_G[d.getMonth()] + " " + d.getFullYear();
}

/* ---------- оценка ставки по графику банка ---------- */

export function inferRateSot(balanceKop: number, payKop: number, months: number): number | null {
  // подобрать ставку, при которой платёж закрывает остаток к N-му месяцу.
  // месяцы целые -> ставке соответствует диапазон, берём середину (последний платёж частичный).
  // null если данных мало; -1 если даже без процентов столько месяцев не закрыть.
  if (!(months > 0) || !(payKop > 0) || !(balanceKop > 0)) return null;
  if (months < Math.ceil(balanceKop / payKop)) return -1;
  const tgt = months - 0.5;
  if (tgt * payKop <= balanceKop) return 0; // и без процентов закроется не раньше — оценка 0%
  const ncont = (rateSotVal: number): number => {
    const i = rateSotVal / 120000;
    const bi = balanceKop * i;
    if (payKop <= bi) return 1e9;
    return -Math.log(1 - bi / payKop) / Math.log(1 + i);
  };
  let lo = 0, hi = 40000; // до 400% годовых
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (ncont(mid) > tgt) hi = mid;
    else lo = mid;
  }
  return Math.round((lo + hi) / 2);
}

export function effRate(ob: Pick<Obligation, "rateSot" | "balanceKop" | "payKop" | "endMonth">, today?: Date): EffectiveRate | null {
  // явная ставка главнее; иначе оценка по (остаток, платёж, дата окончания)
  if (ob.rateSot) return { rateSot: ob.rateSot, est: false };
  const n = monthsToEnd(ob.endMonth, today);
  if ((ob.balanceKop ?? 0) > 0 && (ob.payKop ?? 0) > 0 && n > 0) {
    const r = inferRateSot(ob.balanceKop!, ob.payKop!, n);
    if (r !== null && r >= 0) return { rateSot: r, est: true };
  }
  return null;
}
