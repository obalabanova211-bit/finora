import { describe, it, expect } from "vitest";
import { categoryShares, paidByMonth } from "../src/store";
import type { JournalEntry, MonthPayment } from "../src/domain";

const TODAY = new Date(2026, 10, 21);

function payOf(cat: string, amountKop: number): MonthPayment {
  const ob = { id: 1, name: "", category: cat, payKop: amountKop, day: 1, balanceKop: null, rateSot: null, endMonth: null, event: null, status: "active" as const };
  return { ob, date: new Date(2026, 10, 1), amountKop, status: "upcoming" as const, journal: null };
}

describe("доли категорий", () => {
  it("ровные доли", () => {
    const s = categoryShares([payOf("кредит", 600000), payOf("карта", 300000), payOf("связь", 100000)]);
    expect(s.map(c => c.pct)).toEqual([60, 30, 10]);
    expect(s.reduce((a, c) => a + c.pct, 0)).toBe(100);
  });
  it("с дробями: остаток единиц к наибольшим дробным частям, сумма ровно 100", () => {
    const s = categoryShares([payOf("а", 50000), payOf("б", 33333), payOf("в", 16667)]);
    expect(s.reduce((a, c) => a + c.pct, 0)).toBe(100);
    // точные: 50, 33.333, 16.667 -> 50/33/16 + 1 к «в» (дробная часть больше)
    expect(s.find(c => c.category === "а")!.pct).toBe(50);
    expect(s.find(c => c.category === "б")!.pct).toBe(33);
    expect(s.find(c => c.category === "в")!.pct).toBe(17);
  });
  it("одна категория — 100%", () => {
    const s = categoryShares([payOf("кредит", 12345)]);
    expect(s[0]!.pct).toBe(100);
  });
  it("пусто", () => expect(categoryShares([])).toEqual([]));
});

describe("выплачено по месяцам", () => {
  const journal: JournalEntry[] = [
    { id: 1, obId: 1, date: "2026-09-05", amountKop: 100000 },
    { id: 2, obId: 1, date: "2026-09-20", amountKop: 50000 },
    { id: 3, obId: 1, date: "2026-10-07", amountKop: 700000 },
    { id: 4, obId: 1, date: "2026-11-04", amountKop: 339200 },
    { id: 5, obId: 2, date: "2026-11-21", amountKop: 1060000 },
  ];
  it("сентябрь–ноябрь", () => {
    const rows = paidByMonth(journal, 2026, 10);
    expect(rows.map(r => r.label)).toEqual(["сентябрь 2026", "октябрь 2026", "ноябрь 2026"]);
    expect(rows.map(r => r.amountKop)).toEqual([150000, 700000, 1399200]);
    expect(rows.map(r => r.count)).toEqual([2, 1, 2]);
  });
  it("переход года: январь при mIdx=0", () => {
    const rows = paidByMonth(journal, 2027, 0);
    expect(rows[0]!.label).toBe("ноябрь 2026");
  });
});
