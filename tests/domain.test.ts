import { describe, it, expect } from "vitest";
import {
  parseRubToKop, fmtKop, fmtKopExact, sumBalances,
  daysInMonth, payDateFor, monthKey, nextPayDate, monthsToEnd, endHuman, isEvent,
  isPaidIn, monthPayments, monthTotals, loadPercent,
  interestForMonth, splitPayment, applyPayment,
  simulateClose, endAtTempt, inferRateSot, effRate,
  type Obligation, type JournalEntry,
} from "../src/domain";

const TODAY = new Date(2026, 10, 21); // 21 ноября 2026

describe("деньги", () => {
  it("парсинг рублей в копейки", () => {
    expect(parseRubToKop("17000")).toBe(1700000);
    expect(parseRubToKop("242 000,55")).toBe(24200055);
    expect(parseRubToKop("242000.55")).toBe(24200055);
    expect(parseRubToKop("-500")).toBe(-50000);
    expect(parseRubToKop("")).toBeNull();
    expect(parseRubToKop("abc")).toBeNull();
    expect(parseRubToKop(undefined)).toBeNull();
  });
  it("форматирование", () => {
    expect(fmtKop(24200000)).toBe("242 000 ₽");
    expect(fmtKop(-150000)).toBe("-1 500 ₽");
    expect(fmtKopExact(24200055)).toBe("242 000,55 ₽");
    expect(fmtKopExact(804650)).toBe("8 046,50 ₽");
  });
});

describe("правило конца месяца и даты", () => {
  it("31-е в феврале 2027 -> 28-е", () => expect(payDateFor(31, 2027, 1).getDate()).toBe(28));
  it("30-е в феврале 2028 (високосный) -> 29-е", () => expect(payDateFor(30, 2028, 1).getDate()).toBe(29));
  it("31-е в марте остаётся 31-м", () => expect(payDateFor(31, 2026, 2).getDate()).toBe(31));
  it("nextPayDate: 23-е впереди (21.11)", () => expect(nextPayDate({ day: 23 }, TODAY).getDate()).toBe(23));
  it("nextPayDate: 19-е прошло -> декабрь", () => expect(nextPayDate({ day: 19 }, TODAY).getMonth()).toBe(11));
  it("monthKey", () => expect(monthKey(2026, 10)).toBe("2026-11"));
  it("monthsToEnd: 2026-12 от ноября", () => expect(monthsToEnd("2026-12", TODAY)).toBe(1));
  it("monthsToEnd: 2029-01 от ноября 2026 = 26 мес", () => expect(monthsToEnd("2029-01", TODAY)).toBe(26));
  it("monthsToEnd: пусто", () => expect(monthsToEnd(null, TODAY)).toBe(0));
  it("endHuman", () => expect(endHuman("2029-01")).toBe("январь 2029"));
});

describe("платежи месяца", () => {
  const obs: Obligation[] = [
    { id: 1, name: "А", category: "к", day: 5,  payKop: 500000,  balanceKop: 9000000, rateSot: 1000, endMonth: null, event: null, status: "active" },
    { id: 2, name: "Б", category: "к", day: 27, payKop: 1100000, balanceKop: 8640000, rateSot: 2490, endMonth: null, event: null, status: "active" },
    { id: 3, name: "В", category: "к", day: 10, payKop: 300000,  balanceKop: 1000000, rateSot: null, endMonth: null, event: null, status: "active" },
    { id: 4, name: "Залог", category: "к", day: 1, payKop: null, balanceKop: 1500000, rateSot: null, endMonth: null, event: "съедут арендаторы", status: "active" },
    { id: 5, name: "Закрытое", category: "к", day: 7, payKop: 99000, balanceKop: 0, rateSot: null, endMonth: null, event: null, status: "closed" },
  ];
  const journal: JournalEntry[] = [
    { id: 101, obId: 1, date: "2026-11-05", amountKop: 500000, bodyKop: 425000 },
  ];
  const pays = monthPayments(obs, journal, 2026, 10, TODAY);

  it("по событию и закрытое не входят", () => expect(pays.length).toBe(3));
  it("порядок по датам", () => expect(pays.map(p => p.ob.id).join(",")).toBe("1,3,2"));
  it("оплачен", () => expect(pays[0]!.status).toBe("paid"));
  it("пропущен (10-е, сегодня 21-е)", () => expect(pays[1]!.status).toBe("missed"));
  it("предстоящий (27-е)", () => expect(pays[2]!.status).toBe("upcoming"));
  it("итоги месяца", () => {
    const tot = monthTotals(pays);
    expect(tot.sum).toBe(1900000);
    expect(tot.paidSum).toBe(500000);
    expect(tot.remainSum).toBe(1400000);
    expect(tot.missN).toBe(1);
  });
  it("нагрузка: 19 000 из 130 000", () => expect(loadPercent(pays, 13000000)).toBe(15));
  it("нагрузка: без дохода null", () => expect(loadPercent(pays, null)).toBeNull());
  it("сумма остатков (по событию входит, закрытое нет)", () => expect(sumBalances(obs)).toBe(20140000));
  it("isPaidIn находит запись", () => expect(isPaidIn(obs[0]!, journal, 2026, 10)?.id).toBe(101));
  it("isEvent", () => {
    expect(isEvent(obs[3]!)).toBe(true);
    expect(isEvent(obs[0]!)).toBe(false);
  });
});

describe("списание: сначала проценты", () => {
  it("проценты: карта 242 000 под 39,9%", () => expect(interestForMonth(24200000, 3990)).toBe(804650));
  it("проценты: 25 026 под 16,9%", () => expect(interestForMonth(2502600, 1690)).toBe(35245));
  it("проценты: без ставки 0", () => expect(interestForMonth(1000000, null)).toBe(0));
  it("расклад платежа", () => {
    const sp = splitPayment(2502600, 1690, 1337100);
    expect(sp.interestKop).toBe(35245);
    expect(sp.bodyKop).toBe(1301855);
    expect(sp.covers).toBe(true);
  });
  it("списание по карте", () => {
    const ap = applyPayment({ balanceKop: 24200000, rateSot: 3990 }, 1700000);
    expect(ap.newBalanceKop).toBe(23304650);
    expect(ap.bodyKop).toBe(895350);
    expect(ap.est).toBe(true);
  });
  it("списание без ставки: всё в тело", () => {
    const ap = applyPayment({ balanceKop: 500000, rateSot: null }, 200000);
    expect(ap.newBalanceKop).toBe(300000);
    expect(ap.est).toBe(false);
  });
});

describe("симуляция и оценка ставки", () => {
  it("412 000, 12,5%, 18 500/мес -> 26 мес", () => {
    const sim = simulateClose(41200000, 1250, 1850000);
    expect(sim?.months).toBe(26);
    expect(sim!.interestKop).toBeGreaterThan(5500000);
    expect(sim!.interestKop).toBeLessThan(6500000);
  });
  it("платёж меньше процентов -> null", () => expect(simulateClose(1000000, 6000, 4000)).toBeNull());
  it("оценка ставки: авто ~12,2-12,8%", () => {
    const ir = inferRateSot(41200000, 1850000, 26);
    expect(ir).toBeGreaterThanOrEqual(1220);
    expect(ir).toBeLessThanOrEqual(1280);
  });
  it("оценка ставки: рассрочка 0%", () => expect(inferRateSot(1650000, 550000, 3)).toBe(0));
  it("оценка ставки: не сходится -> -1", () => expect(inferRateSot(10000000, 100000, 50)).toBe(-1));
  it("effRate: оценка по графику", () => {
    const er = effRate({ balanceKop: 41200000, payKop: 1850000, rateSot: null, endMonth: "2029-01" }, TODAY);
    expect(er?.est).toBe(true);
    expect(er!.rateSot).toBeGreaterThanOrEqual(1220);
    expect(er!.rateSot).toBeLessThanOrEqual(1280);
  });
  it("effRate: явная ставка главнее", () => {
    const er = effRate({ balanceKop: 24200000, payKop: 1700000, rateSot: 3990, endMonth: null }, TODAY);
    expect(er).toEqual({ rateSot: 3990, est: false });
  });
  it("effRate: без данных null", () =>
    expect(effRate({ balanceKop: 1500000, payKop: null, rateSot: null, endMonth: null }, TODAY)).toBeNull());
  it("конец по темпу: 26 платежей от 19-х", () =>
    expect(endAtTempt({ day: 19, payKop: 1850000 }, 26)).toBe("января 2029"));
  it("daysInMonth февраль 2028", () => expect(daysInMonth(2028, 1)).toBe(29));
});
