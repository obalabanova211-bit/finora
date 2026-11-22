/* Демонстрационные данные для кнопки «Показать на примере».
   Те же позиции, что в прототипе finora.html. */

import { type AppState, addObligation, type ObligationDraft } from "./store";

const DEMO: ObligationDraft[] = [
  { name: "Автокредит", category: "Автокредит", payKop: 1850000, day: 19, balanceKop: 41200000, rateSot: null, endMonth: "2029-01", event: null, status: "active", recipient: "Т-Банк", note: "Ставка неизвестна — оценена по графику банка" },
  { name: "Карта", category: "Кредитная карта", payKop: 1700000, day: 23, balanceKop: 24200000, rateSot: 3990, endMonth: null, event: null, status: "active", recipient: "Сбер" },
  { name: "Рассрочка на телефон", category: "Рассрочка", payKop: 550000, day: 12, balanceKop: 1650000, rateSot: 0, endMonth: "2027-02", event: null, status: "active", recipient: "Магнит" },
  { name: "Старый кредит", category: "Потребительский кредит", payKop: 430000, day: 5, balanceKop: 3100000, rateSot: 2490, endMonth: null, event: null, status: "active", recipient: "ВТБ" },
  { name: "Аренда квартиры", category: "Аренда", payKop: 3500000, day: 1, balanceKop: null, rateSot: null, endMonth: null, event: null, status: "active" },
  { name: "Связь", category: "Связь", payKop: 60000, day: 27, balanceKop: null, rateSot: null, endMonth: null, event: null, status: "active" },
  { name: "Залог за квартиру", category: "Другое", payKop: null, day: 1, balanceKop: 1500000, rateSot: null, endMonth: null, event: "съедут арендаторы", status: "active" },
];

export function demoState(): AppState {
  let st: AppState = { v: 1, welcomed: true, incomeKop: 13000000, lastBackup: null, seq: 1, obligations: [], journal: [] };
  for (const d of DEMO) st = addObligation(st, d);
  return st;
}
