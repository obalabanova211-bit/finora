import { describe, it, expect } from "vitest";
import {
  emptyState, addObligation, updateObligation, deleteObligation, closeObligation,
  recordPayment, undoPayment, listSections, sectionTotals,
  type ObligationDraft,
} from "../src/store";

const TODAY = new Date(2026, 10, 21); // 21 ноября 2026

function draft(p: Partial<ObligationDraft> = {}): ObligationDraft {
  return {
    name: "Карта", category: "кредитка", payKop: 1700000, day: 23,
    balanceKop: 24200000, rateSot: 3990, endMonth: null, event: null, status: "active",
    ...p,
  };
}

describe("операции с обязательствами", () => {
  it("addObligation: id из счётчика, welcomed", () => {
    let st = emptyState();
    st = addObligation(st, draft());
    expect(st.obligations[0]!.id).toBe(1);
    expect(st.seq).toBe(2);
    expect(st.welcomed).toBe(true);
  });
  it("updateObligation меняет только патч", () => {
    let st = addObligation(emptyState(), draft());
    st = updateObligation(st, 1, { balanceKop: 23000000 });
    expect(st.obligations[0]!.balanceKop).toBe(23000000);
    expect(st.obligations[0]!.name).toBe("Карта");
  });
  it("deleteObligation удаляет и журнал", () => {
    let st = addObligation(emptyState(), draft());
    st = recordPayment(st, 1, 1700000, { useAuto: true }, TODAY).state;
    expect(st.journal.length).toBe(1);
    st = deleteObligation(st, 1);
    expect(st.obligations.length).toBe(0);
    expect(st.journal.length).toBe(0);
  });
  it("closeObligation: статус и остаток 0", () => {
    let st = addObligation(emptyState(), draft());
    st = closeObligation(st, 1);
    expect(st.obligations[0]!.status).toBe("closed");
    expect(st.obligations[0]!.balanceKop).toBe(0);
  });
});

describe("оплата", () => {
  it("списание по карте: сначала проценты (эталон домена)", () => {
    let st = addObligation(emptyState(), draft());
    const r = recordPayment(st, 1, 1700000, { useAuto: true }, TODAY, "2026-11-23");
    expect(r.interestKop).toBe(804650);
    expect(r.bodyKop).toBe(895350);
    expect(r.est).toBe(true);
    const ob = r.state.obligations[0]!;
    expect(ob.balanceKop).toBe(23304650);
    expect(ob.status).toBe("active");
    expect(r.state.journal[0]!.bodyKop).toBe(895350);
    expect(r.state.journal[0]!.date).toBe("2026-11-23");
  });
  it("оценённая по графику ставка тоже раскладывает", () => {
    let st = addObligation(emptyState(), draft({
      name: "Автокредит", payKop: 1850000, balanceKop: 41200000,
      rateSot: null, endMonth: "2029-01",
    }));
    const r = recordPayment(st, 1, 1850000, { useAuto: true }, TODAY);
    expect(r.est).toBe(true);
    expect(r.interestKop).toBeGreaterThan(400000);
    expect(r.bodyKop).toBeLessThan(1450000);
  });
  it("точный остаток из банка главнее оценки", () => {
    let st = addObligation(emptyState(), draft());
    const r = recordPayment(st, 1, 1700000, { useAuto: true, exactBalanceKop: 24000000 }, TODAY);
    expect(r.bodyKop).toBe(200000);
    expect(r.state.obligations[0]!.balanceKop).toBe(24000000);
  });
  it("точный остаток 0 закрывает", () => {
    let st = addObligation(emptyState(), draft());
    const r = recordPayment(st, 1, 2420000, { useAuto: true, exactBalanceKop: 0 }, TODAY);
    expect(r.closedNow).toBe(true);
    expect(r.state.obligations[0]!.status).toBe("closed");
    expect(r.state.obligations[0]!.balanceKop).toBe(0);
  });
  it("без учёта в остатке: только запись в журнале", () => {
    let st = addObligation(emptyState(), draft());
    const r = recordPayment(st, 1, 1700000, { useAuto: false }, TODAY);
    expect(r.bodyKop).toBe(0);
    expect(r.state.obligations[0]!.balanceKop).toBe(24200000);
    expect(r.state.journal.length).toBe(1);
  });
  it("регулярный платёж без остатка", () => {
    let st = addObligation(emptyState(), draft({
      name: "Аренда", payKop: 3500000, balanceKop: null, rateSot: null,
    }));
    const r = recordPayment(st, 1, 3500000, { useAuto: true }, TODAY);
    expect(r.bodyKop).toBe(0);
    expect(r.state.obligations[0]!.balanceKop).toBeNull();
  });
  it("частичный возврат «по событию» уменьшает сумму", () => {
    let st = addObligation(emptyState(), draft({
      name: "Залог", payKop: null, day: 1, balanceKop: 1500000, rateSot: null, event: "съедут арендаторы",
    }));
    const r = recordPayment(st, 1, 500000, { useAuto: true, exactBalanceKop: 1000000 }, TODAY);
    expect(r.bodyKop).toBe(500000);
    expect(r.state.obligations[0]!.balanceKop).toBe(1000000);
  });
  it("undoPayment возвращает остаток и активный статус", () => {
    let st = addObligation(emptyState(), draft());
    const r = recordPayment(st, 1, 1700000, { useAuto: true }, TODAY);
    st = r.state;
    st = undoPayment(st, r.journalId);
    expect(st.obligations[0]!.balanceKop).toBe(24200000);
    expect(st.journal.length).toBe(0);
    expect(st.seq).toBe(3); // счётчик не откатываем — id уникальны
  });
  it("undo закрытого по точному остатку 0", () => {
    let st = addObligation(emptyState(), draft());
    const r = recordPayment(st, 1, 2420000, { useAuto: true, exactBalanceKop: 0 }, TODAY);
    st = undoPayment(r.state, r.journalId);
    expect(st.obligations[0]!.balanceKop).toBe(24200000);
    expect(st.obligations[0]!.status).toBe("active");
  });
  it("нулевая сумма — ошибка", () => {
    const st = addObligation(emptyState(), draft());
    expect(() => recordPayment(st, 1, 0, { useAuto: false }, TODAY)).toThrow();
  });
});

describe("список с секциями", () => {
  function build() {
    let st = emptyState();
    st = addObligation(st, draft({ name: "Карта", recipient: "банк А" }));
    st = addObligation(st, draft({ name: "Автокредит", recipient: "банк Б", category: "кредит", payKop: 1850000, balanceKop: 41200000, rateSot: null, endMonth: "2029-01", day: 19 }));
    st = addObligation(st, draft({ name: "Аренда", category: "жильё", payKop: 3500000, balanceKop: null, rateSot: null, day: 5 }));
    st = addObligation(st, draft({ name: "Залог", category: "разовое", payKop: null, balanceKop: 1500000, rateSot: null, event: "съедут арендаторы", day: 1 }));
    st = addObligation(st, draft({ name: "Старая карта", payKop: 990000, balanceKop: 500000, rateSot: 2500, day: 7 }));
    st = closeObligation(st, 5);
    return st;
  }
  it("три активные секции + закрытые", () => {
    const s = listSections(build());
    expect(s.credits.map(o => o.name).join("|")).toBe("Карта|Автокредит"); // «банк А» < «банк Б»
    expect(s.regular.map(o => o.name)).toEqual(["Аренда"]);
    expect(s.events.map(o => o.name)).toEqual(["Залог"]);
    expect(s.closed.map(o => o.name)).toEqual(["Старая карта"]);
  });
  it("итоги секций", () => {
    const s = listSections(build());
    const t = sectionTotals(s);
    expect(t.balanceCredits).toBe(24200000 + 41200000); // в списке — только кредиты и рассрочки
    expect(t.balanceTotal).toBe(24200000 + 41200000 + 1500000); // сумма обязательств включает «по событию»
    expect(t.payCredits).toBe(1700000 + 1850000);
    expect(t.payRegular).toBe(3500000);
    expect(t.payTotal).toBe(7050000);
  });
});
