/* Данные Олеси из её таблицы (занесены 21.11.2026, перенос в приложение 23.11.2026).
   Копейки и сотые процента; даты окончания зафиксированы как в личной версии прототипа. */

import { type AppState, addObligation, type ObligationDraft } from "./store";

const MY: ObligationDraft[] = [
  // мои кредиты и рассрочки
  { name: "Кредитная карта", category: "Кредитная карта", payKop: 1700000, day: 23, balanceKop: 24200000, rateSot: 3990, endMonth: null, event: null, status: "active", recipient: "", note: "" },
  { name: "Ренесанс", category: "Потребительский кредит", payKop: 1060000, day: 21, balanceKop: 25844000, rateSot: 3880, endMonth: null, event: null, status: "active", recipient: "Ренесанс", note: "" },
  { name: "Халва", category: "Рассрочка", payKop: 339200, day: 4, balanceKop: 4050000, rateSot: 1964, endMonth: null, event: null, status: "active", recipient: "Совкомбанк", note: "" },
  { name: "Совкомбанк (23-го)", category: "Потребительский кредит", payKop: 1164900, day: 23, balanceKop: 22769500, rateSot: 990, endMonth: null, event: null, status: "active", recipient: "Совкомбанк", note: "" },
  { name: "Совкомбанк (27-го)", category: "Потребительский кредит", payKop: 1337100, day: 27, balanceKop: 2502600, rateSot: 1690, endMonth: null, event: null, status: "active", recipient: "Совкомбанк", note: "последний платёж ~12 200 в декабре" },
  { name: "Ренесанс (айфон)", category: "Потребительский кредит", payKop: 576000, day: 22, balanceKop: 10997300, rateSot: 1239, endMonth: null, event: null, status: "active", recipient: "Ренесанс", note: "" },
  { name: "Альфа-Деньги", category: "Потребительский кредит", payKop: 540000, day: 8, balanceKop: 5688600, rateSot: 930, endMonth: null, event: null, status: "active", recipient: "Альфа", note: "" },
  { name: "Совкомбанк (дух. с/м)", category: "Потребительский кредит", payKop: 580000, day: 13, balanceKop: 557100, rateSot: null, endMonth: "2026-12", event: null, status: "active", recipient: "Совкомбанк", note: "декабрь — последний, 5 571" },
  // платит семья — видны для полной картины
  { name: "Сбербанк (авто)", category: "Автокредит", payKop: 2000000, day: 15, balanceKop: 18000000, rateSot: null, endMonth: "2027-09", event: null, status: "active", recipient: "Сбербанк", note: "платит семья" },
  { name: "Сбербанк (папа)", category: "Потребительский кредит", payKop: 540000, day: 12, balanceKop: 16916400, rateSot: null, endMonth: "2032-11", event: null, status: "active", recipient: "Сбербанк", note: "платит семья" },
  { name: "Кредит на папе", category: "Потребительский кредит", payKop: 89000, day: 11, balanceKop: 840000, rateSot: null, endMonth: "2027-10", event: null, status: "active", recipient: "", note: "платит семья" },
  // вернуть по событию — без платежей и дат
  { name: "Ломбард", category: "Другое", payKop: null, day: 1, balanceKop: 5667000, rateSot: null, endMonth: null, event: "выкупить залог", status: "active", recipient: "Ломбард", note: "проценты капают — гасить первым" },
  { name: "ЖКХ (театр)", category: "Коммунальные платежи", payKop: null, day: 1, balanceKop: 600000, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "", note: "" },
  { name: "ЖКХ (коммуна)", category: "Коммунальные платежи", payKop: null, day: 1, balanceKop: 500000, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "", note: "" },
  { name: "Залог (коммуна)", category: "Другое", payKop: null, day: 1, balanceKop: 1500000, rateSot: null, endMonth: null, event: "съедут арендаторы", status: "active", recipient: "", note: "" },
  { name: "Римма", category: "Другое", payKop: null, day: 1, balanceKop: 4030900, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "Римма", note: "" },
  { name: "Эрмен", category: "Другое", payKop: null, day: 1, balanceKop: 2000000, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "Эрмен", note: "" },
  { name: "Юра Тай (свет)", category: "Другое", payKop: null, day: 1, balanceKop: 1500000, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "Юра (Тай)", note: "" },
  { name: "Юра Тай (налог)", category: "Другое", payKop: null, day: 1, balanceKop: 400000, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "Юра (Тай)", note: "" },
  { name: "Синару (фрукты)", category: "Другое", payKop: null, day: 1, balanceKop: 200000, rateSot: null, endMonth: null, event: "когда будут деньги", status: "active", recipient: "Синару", note: "" },
];

// ноябрь 2026: что уже заплачено до 21-го (как в личной версии)
const NOV: [number, number, number][] = [
  [3, 4, 339200],     // Халва
  [7, 8, 540000],     // Альфа-Деньги
  [11, 11, 89000],    // Кредит на папе (семья)
  [10, 12, 540000],   // Сбербанк (папа) (семья)
  [8, 13, 580000],    // Совкомбанк (дух. с/м)
  [9, 15, 2000000],   // Сбербанк (авто) (семья)
  [2, 21, 1060000],   // Ренесанс
];

export function myDataState(): AppState {
  let st: AppState = { v: 1, welcomed: true, incomeKop: null, lastBackup: null, seq: 1, obligations: [], journal: [] };
  for (const d of MY) st = addObligation(st, d);
  for (const [obId, day, amountKop] of NOV) {
    st = {
      ...st,
      journal: [...st.journal, { id: st.seq, obId, date: "2026-11-" + (day < 10 ? "0" : "") + day, amountKop, bodyKop: amountKop, est: false }],
      seq: st.seq + 1,
    };
  }
  return st;
}
