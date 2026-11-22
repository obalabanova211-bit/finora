import { describe, it, expect } from "vitest";
import { backupFileName, parseBackup, serializeBackup } from "../src/backup";
import { myDataState } from "../src/mydata";
import { emptyState } from "../src/store";

describe("резервная копия", () => {
  it("имя файла с датой", () => {
    expect(backupFileName(new Date(2026, 10, 23))).toBe("finora-копия-2026-11-23.json");
  });
  it("копия читается обратно без потерь", () => {
    const st = myDataState();
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
