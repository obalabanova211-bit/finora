/* Тесты доменной логики Finora. Эталоны сверены с прототипом и данными Олеси. */

var PASS = 0, FAIL = 0;
function T(name, cond, extra) { if (cond) { PASS++; print("OK   " + name); } else { FAIL++; print("FAIL " + name + (extra !== undefined ? "  получено: " + extra : "")); } }
function eq(name, got, want) { T(name, got === want, got + " (ожидалось " + want + ")"); }

var TODAY = new Date(2026, 10, 21); // 21 ноября 2026

/* ---------- деньги ---------- */
eq("parseRub: 17000", parseRubToKop("17000"), 1700000);
eq("parseRub: 242 000,55", parseRubToKop("242 000,55"), 24200055);
eq("parseRub: 242000.55", parseRubToKop("242000.55"), 24200055);
eq("parseRub: -500", parseRubToKop("-500"), -50000);
eq("parseRub: пусто -> null", parseRubToKop(""), null);
eq("parseRub: мусор -> null", parseRubToKop("abc"), null);
eq("parseRub: undefined -> null", parseRubToKop(undefined), null);
eq("fmtKop: 24200000", fmtKop(24200000), "242 000 ₽");
eq("fmtKop: -150000", fmtKop(-150000), "-1 500 ₽");
eq("fmtKopExact: копейки", fmtKopExact(24200055), "242 000,55 ₽");
eq("fmtKopExact: выравнивание", fmtKopExact(804650), "8 046,50 ₽");

/* ---------- правило конца месяца и даты ---------- */
eq("конец месяца: 31-е в феврале 2027", payDateFor({ day: 31 }, 2027, 1).getDate(), 28);
eq("конец месяца: 30-е в феврале 2028 (високосный)", payDateFor({ day: 30 }, 2028, 1).getDate(), 29);
eq("конец месяца: 31-е в марте остаётся 31-м", payDateFor({ day: 31 }, 2026, 2).getDate(), 31);
eq("nextPayDate: 23-е ещё впереди (21.11)", nextPayDate({ day: 23 }, TODAY).getDate(), 23);
eq("nextPayDate: 19-е прошло -> декабрь", nextPayDate({ day: 19 }, TODAY).getMonth(), 11);
eq("monthKey", monthKey(2026, 10), "2026-11");
eq("monthsToEnd: 2026-12 от ноября", monthsToEnd("2026-12", TODAY), 1);
eq("monthsToEnd: 2029-01 от ноября 2026 = 26 мес", monthsToEnd("2029-01", TODAY), 26);
eq("monthsToEnd: пусто", monthsToEnd(null, TODAY), 0);
eq("endHuman", endHuman("2029-01"), "январь 2029");

/* ---------- платежи месяца ---------- */
var obs = [
  { id: 1, name: "А", day: 5,  payKop: 500000,  balanceKop: 9000000, rateSot: 1000, status: "active", event: null },
  { id: 2, name: "Б", day: 27, payKop: 1100000, balanceKop: 8640000, rateSot: 2490, status: "active", event: null },
  { id: 3, name: "В", day: 10, payKop: 300000,  balanceKop: 1000000, rateSot: null, status: "active", event: null },
  { id: 4, name: "Залог", day: 1, payKop: null, balanceKop: 1500000, rateSot: null, status: "active", event: "съедут арендаторы" },
  { id: 5, name: "Закрытое", day: 7, payKop: 99000, balanceKop: 0, rateSot: null, status: "closed", event: null }
];
var journal = [
  { id: 101, obId: 1, date: "2026-11-05", amountKop: 500000, bodyKop: 425000 }
];
var pays = monthPayments(obs, journal, 2026, 10, TODAY);
eq("месяц: количество (по событию и закрытое не входят)", pays.length, 3);
eq("месяц: порядок по датам", pays[0].ob.id + "," + pays[1].ob.id + "," + pays[2].ob.id, "1,3,2");
eq("месяц: оплачен", pays[0].status, "paid");
eq("месяц: пропущен (10-е, сегодня 21-е)", pays[1].status, "missed");
eq("месяц: предстоящий (27-е)", pays[2].status, "upcoming");
var tot = monthTotals(pays);
eq("месяц: сумма", tot.sum, 1900000);
eq("месяц: оплачено", tot.paidSum, 500000);
eq("месяц: осталось", tot.remainSum, 1400000);
eq("месяц: пропусков", tot.missN, 1);
eq("нагрузка: 19 000 из 130 000", loadPercent(pays, 13000000), 15);
eq("нагрузка: без дохода null", loadPercent(pays, null), null);
eq("сумма остатков (по событию входит, закрытое нет)", sumBalances(obs), 20140000);
eq("isEvent: да", isEvent(obs[3]), true);
eq("isEvent: нет", isEvent(obs[0]), false);

/* ---------- списание: сначала проценты ---------- */
eq("проценты: карта 242 000 под 39,9%", interestForMonth(24200000, 3990), 804650);
eq("проценты: 25 026 под 16,9%", interestForMonth(2502600, 1690), 35245);
eq("проценты: без ставки 0", interestForMonth(1000000, null), 0);
var sp = splitPayment(2502600, 1690, 1337100);
eq("расклад: проценты", sp.interestKop, 35245);
eq("расклад: тело", sp.bodyKop, 1301855);
eq("расклад: покрывает", sp.covers, true);
var ap = applyPayment({ balanceKop: 24200000, rateSot: 3990 }, 1700000);
eq("списание: новый остаток карты", ap.newBalanceKop, 23304650);
eq("списание: тело", ap.bodyKop, 895350);
eq("списание: пометка оценки", ap.est, true);
var ap2 = applyPayment({ balanceKop: 500000, rateSot: null }, 200000);
eq("списание без ставки: всё в тело", ap2.newBalanceKop, 300000);
eq("списание без ставки: без пометки", ap2.est, false);

/* ---------- симуляция и оценка ставки ---------- */
var sim = simulateClose(41200000, 1250, 1850000);
eq("симуляция: 412 000, 12,5%, 18 500/мес", sim.months, 26);
T("симуляция: проценты ~5,9 млн коп (последний платёж частичный)", sim.interestKop > 5500000 && sim.interestKop < 6500000, sim.interestKop);
eq("симуляция: платёж меньше процентов -> null", simulateClose(1000000, 6000, 4000), null);
var ir = inferRateSot(41200000, 1850000, 26);
T("оценка ставки: авто ~12,2-12,8%", ir >= 1220 && ir <= 1280, ir);
eq("оценка ставки: рассрочка 0%", inferRateSot(1650000, 550000, 3), 0);
eq("оценка ставки: не сходится -> -1", inferRateSot(10000000, 100000, 50), -1);
var er1 = effRate({ balanceKop: 41200000, payKop: 1850000, rateSot: null, endMonth: "2029-01" }, TODAY);
T("effRate: оценка по графику", er1 && er1.est === true && er1.rateSot >= 1220 && er1.rateSot <= 1280, er1 && er1.rateSot);
var er2 = effRate({ balanceKop: 24200000, payKop: 1700000, rateSot: 3990, endMonth: null }, TODAY);
eq("effRate: явная ставка главнее", er2.est, false);
eq("effRate: явная ставка значение", er2.rateSot, 3990);
eq("effRate: без данных null", effRate({ balanceKop: 1500000, payKop: null, rateSot: null, endMonth: null }, TODAY), null);
eq("конец по темпу: 26 платежей от 19-х", endAtTempt({ day: 19, payKop: 1850000 }, 26), "января 2029");

print("----");
print("PASS=" + PASS + " FAIL=" + FAIL);
