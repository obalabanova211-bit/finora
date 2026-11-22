/* ====================================================================
   Finora — доменная логика (Задача 4).
   Правила:
   - деньги — ТОЛЬКО целые копейки: 24200000 = 242 000,00 ₽;
   - ставки — целые сотые доли процента в год: 3990 = 39,90%;
   - никаких float в денежных расчётах: рубли из интерфейса парсятся
     в копейки напрямую из строки (parseRubToKop);
   - модуль не знает про UI, браузер и хранение — только Math и Date;
   - слово «долг» не используется.
   ==================================================================== */

/* ---------- деньги ---------- */

function parseRubToKop(s) {
  // "242 000,55" -> 24200055; "17000" -> 1700000; "" -> null
  if (s === null || s === undefined) return null;
  s = String(s).replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  var neg = s.charAt(0) === "-";
  if (neg) s = s.slice(1);
  var p = s.split(".");
  var rub = p[0] === "" ? 0 : parseInt(p[0], 10);
  if (isNaN(rub)) return null;
  var kop = 0;
  if (p.length > 1) {
    var fr = (p[1] + "00").slice(0, 2); // максимум копейки
    kop = parseInt(fr, 10);
  }
  var v = rub * 100 + kop;
  return neg ? -v : v;
}

function fmtKop(kop) {
  // 24200000 -> "242 000 ₽" (показ с округлением до рубля)
  var neg = kop < 0 ? "-" : "";
  var rub = Math.round(Math.abs(kop) / 100);
  return neg + String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
}

function fmtKopExact(kop) {
  // 24200055 -> "242 000,55 ₽"
  var neg = kop < 0 ? "-" : "";
  var k = Math.abs(Math.round(kop));
  var rub = Math.floor(k / 100), ck = k % 100;
  return neg + String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + (ck < 10 ? "0" : "") + ck + " ₽";
}

function sumBalances(obligations) {
  // сумма остатков активных обязательств с остатком (включая «по событию»)
  var s = 0;
  for (var i = 0; i < obligations.length; i++) {
    var o = obligations[i];
    if (o.status === "active" && o.balanceKop) s += o.balanceKop;
  }
  return s;
}

/* ---------- даты платежей ---------- */

var MONTH_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
var MONTH_RU_G = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function daysInMonth(y, mIdx) { return new Date(y, mIdx + 1, 0).getDate(); }

function payDateFor(ob, y, mIdx) {
  // правило конца месяца: 31-е в феврале -> 28/29-е, 30-е в 31-дневном -> 31-го не бывает и т.п.
  return new Date(y, mIdx, Math.min(ob.day, daysInMonth(y, mIdx)));
}

function monthKey(y, mIdx) { return y + "-" + (mIdx + 1 < 10 ? "0" : "") + (mIdx + 1); }

function nextPayDate(ob, today) {
  var t = today || new Date();
  t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  var d = payDateFor(ob, t.getFullYear(), t.getMonth());
  if (d < t) d = payDateFor(ob, d.getFullYear(), d.getMonth() + 1);
  return d;
}

function monthsToEnd(endMonth, today) {
  // сколько полных месяцев от текущего месяца до "YYYY-MM" включительно; 0 если нет или прошло
  if (!endMonth) return 0;
  var t = today || new Date();
  var p = endMonth.split("-");
  return (parseInt(p[0], 10) - t.getFullYear()) * 12 + (parseInt(p[1], 10) - 1 - t.getMonth());
}

function endHuman(endMonth) {
  var p = endMonth.split("-");
  return MONTH_RU[parseInt(p[1], 10) - 1] + " " + p[0];
}

function isEvent(ob) { return ob.event !== null && ob.event !== undefined; } // «вернуть по событию»

/* ---------- платежи месяца ---------- */

function isPaidIn(ob, journal, y, mIdx) {
  var key = monthKey(y, mIdx);
  for (var i = 0; i < journal.length; i++) {
    var j = journal[i];
    if (j.obId === ob.id && j.date.slice(0, 7) === key) return j;
  }
  return null;
}

function monthPayments(obligations, journal, y, mIdx, today) {
  // список платежей месяца: только обычные обязательства («по событию» не участвуют)
  var t = today || new Date();
  t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  var out = [];
  for (var i = 0; i < obligations.length; i++) {
    var o = obligations[i];
    if (o.status !== "active" || !o.payKop) continue;
    var d = payDateFor(o, y, mIdx);
    var pj = isPaidIn(o, journal, y, mIdx);
    var status = pj ? "paid" : (d < t ? "missed" : "upcoming");
    out.push({ ob: o, date: d, amountKop: o.payKop, status: status, journal: pj });
  }
  out.sort(function (a, b) { return a.date - b.date; });
  return out;
}

function monthTotals(pays) {
  var sum = 0, paidN = 0, paidSum = 0, remainSum = 0, missN = 0;
  for (var i = 0; i < pays.length; i++) {
    var p = pays[i];
    sum += p.amountKop;
    if (p.status === "paid") { paidN++; paidSum += p.amountKop; }
    else remainSum += p.amountKop;
    if (p.status === "missed") missN++;
  }
  return { count: pays.length, sum: sum, paidN: paidN, paidSum: paidSum, remainSum: remainSum, missN: missN };
}

/* ---------- финансовая нагрузка ---------- */

function loadPercent(pays, incomeKop) {
  // платежи месяца к доходу, целые проценты; null если доход не указан
  if (!incomeKop || incomeKop <= 0) return null;
  var tot = monthTotals(pays);
  return Math.round(tot.sum / incomeKop * 100);
}

/* ---------- списание платежа: сначала проценты, потом тело ---------- */

function interestForMonth(balanceKop, rateSot) {
  // проценты за один месяц: остаток * ставка/12; сотые процента -> делить на 100 ещё раз
  if (!rateSot) return 0;
  return Math.round(balanceKop * rateSot / 120000);
}

function splitPayment(balanceKop, rateSot, payKop) {
  var intKop = interestForMonth(balanceKop, rateSot);
  var bodyKop = payKop - intKop;
  return { interestKop: intKop, bodyKop: bodyKop, covers: bodyKop >= 0 };
}

function applyPayment(ob, payKop) {
  // возвращает новый остаток и расклад; вся история кредита зашита в текущем остатке
  var r = splitPayment(ob.balanceKop, ob.rateSot || 0, payKop);
  var body = Math.max(0, r.bodyKop);
  var newBalance = Math.max(0, ob.balanceKop - body);
  return { newBalanceKop: newBalance, interestKop: r.interestKop, bodyKop: body, est: !!ob.rateSot };
}

/* ---------- симуляция закрытия (аннуитет) ---------- */

function simulateClose(balanceKop, rateSot, payKop) {
  // сколько месяцев закроется и сколько всего процентов; null если платёж не покрывает проценты
  if (!(payKop > 0) || balanceKop <= 0) return null;
  var b = balanceKop, months = 0, interest = 0;
  while (b > 0 && months < 600) {
    var int_ = interestForMonth(b, rateSot);
    if (payKop <= int_) return null;
    interest += int_;
    b -= (payKop - int_);
    months++;
  }
  return { months: months, interestKop: interest };
}

function endAtTempt(ob, months) {
  // месяц последнего платежа: от ближайшей даты платежа, а не от «сегодня»
  var d = ob.payKop ? nextPayDate(ob) : new Date();
  d = payDateFor(ob, d.getFullYear(), d.getMonth() + months - 1);
  return MONTH_RU_G[d.getMonth()] + " " + d.getFullYear();
}

/* ---------- оценка ставки по графику банка ---------- */

function inferRateSot(balanceKop, payKop, months) {
  // подобрать ставку, при которой платёж закрывает остаток к N-му месяцу.
  // месяцы целые -> ставке соответствует диапазон, берём середину (последний платёж частичный).
  // null если данных мало; -1 если даже без процентов столько месяцев не закрыть.
  if (!(months > 0) || !(payKop > 0) || !(balanceKop > 0)) return null;
  if (months < Math.ceil(balanceKop / payKop)) return -1;
  var tgt = months - 0.5;
  if (tgt * payKop <= balanceKop) return 0; // и без процентов закроется не раньше — оценка 0%
  function ncont(rateSotVal) {
    var i = rateSotVal / 120000;
    var bi = balanceKop * i;
    if (payKop <= bi) return 1e9;
    return -Math.log(1 - bi / payKop) / Math.log(1 + i);
  }
  var lo = 0, hi = 40000; // до 400% годовых
  for (var k = 0; k < 60; k++) {
    var mid = (lo + hi) / 2;
    if (ncont(mid) > tgt) hi = mid; else lo = mid;
  }
  return Math.round((lo + hi) / 2);
}

function effRate(ob, today) {
  // { rateSot, est } или null. Явная ставка главнее; иначе оценка по (остаток, платёж, дата окончания).
  if (ob.rateSot) return { rateSot: ob.rateSot, est: false };
  var n = monthsToEnd(ob.endMonth, today);
  if (ob.balanceKop > 0 && ob.payKop > 0 && n > 0) {
    var r = inferRateSot(ob.balanceKop, ob.payKop, n);
    if (r >= 0) return { rateSot: r, est: true };
  }
  return null;
}
