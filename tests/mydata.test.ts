import { describe, it, expect } from "vitest";
import { myDataState } from "../src/mydata";
import { listSections, sectionTotals, undoPayment } from "../src/store";
import { monthPayments, monthTotals } from "../src/domain";

const NOV21 = new Date(2026, 10, 21); // 21 ноября 2026 — дата занесения данных

describe("перенос данных Олеси (21.11.2026)", () => {
  const st = myDataState();
  const secs = listSections(st);
  const tot = sectionTotals(secs);

  it("20 обязательств: 11 с платежом и 9 «по событию»", () => {
    expect(st.obligations.length).toBe(20);
    expect(secs.credits.length).toBe(11);
    expect(secs.regular.length).toBe(0);
    expect(secs.events.length).toBe(9);
    expect(secs.closed.length).toBe(0);
  });
  it("суммы совпадают с личной версией прототипа", () => {
    expect(tot.balanceCredits).toBe(132365500); // 1 323 655 ₽
    expect(tot.balanceTotal).toBe(148763400);   // 1 487 634 ₽ = кредиты + по событию
    expect(tot.payTotal).toBe(9926200);          // 99 262 ₽ в месяц
  });
  it("ноябрь: 7 отметок оплат, все за свои даты", () => {
    expect(st.journal.length).toBe(7);
    const ids = new Set(st.journal.map(j => j.obId));
    expect([...ids].sort((a, b) => a - b)).toEqual([2, 3, 7, 8, 9, 10, 11]);
    for (const j of st.journal) expect(j.date.slice(0, 7)).toBe("2026-11");
  });
  it("картина ноября на 21-е: оплачено 7 из 11, без пропусков", () => {
    const pays = monthPayments(st.obligations, st.journal, 2026, 10, NOV21);
    const t = monthTotals(pays);
    expect(t.count).toBe(11);
    expect(t.paidN).toBe(7);
    expect(t.missN).toBe(0);
  });
  it("отмена ноябрьской отметки возвращает остаток", () => {
    const halva = st.journal.find(j => j.obId === 3)!;
    const after = undoPayment(st, halva.id);
    expect(after.obligations.find(o => o.id === 3)!.balanceKop).toBe(4050000 + 339200);
    expect(after.journal.length).toBe(6);
  });
  it("счётчик id не пересекается с записями журнала", () => {
    const maxJournalId = Math.max(...st.journal.map(j => j.id));
    expect(st.seq).toBeGreaterThan(maxJournalId);
  });
});
