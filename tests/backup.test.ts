import { describe, it, expect } from "vitest";
import { backupFileName, parseBackup, serializeBackup } from "../src/backup";
import { addObligation, emptyState } from "../src/store";

describe("резервная копия", () => {
  it("имя файла с датой", () => {
    expect(backupFileName(new Date(2026, 10, 23))).toBe("finora-копия-2026-11-23.json");
  });
  it("копия читается обратно без потерь", () => {
    let st = emptyState();
    st = addObligation(st, { name: "Карта", category: "Кредитная карта", payKop: 1700000, day: 23, balanceKop: 24200000, rateSot: 3990, endMonth: null, event: null, status: "active" });
    st = { ...st, journal: [...st.journal, { id: st.seq, obId: 1, date: "2026-11-23", amountKop: 1700000, bodyKop: 895350, est: true }] };
    const back = parseBackup(serializeBackup(st));
    expect(back).toEqual(st);
  });
  it("пустое состояние тоже проходит круг", () => {
    expect(parseBackup(serializeBackup(emptyState()))).toEqual(emptyState());
  });
  it("не копия Finora — null", () => {
    expect(parseBackup("привет")).toBeNull();
    expect(parseBackup("{}")).toBeNull();
    expect(parseBackup(JSON.stringify({ data: { obligations: 5 } }))).toBeNull();
  });
});
