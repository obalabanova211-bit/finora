"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Главная", icon: "home", soon: false },
  { href: "/obligations", label: "Обязательства", icon: "list", soon: false },
  { href: "/calendar", label: "Календарь", icon: "cal", soon: false },
  { href: "/analytics", label: "Аналитика", icon: "chart", soon: true },
  { href: "/settings", label: "Настройки", icon: "gear", soon: true },
];

function Icon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg viewBox="0 0 24 24" {...p}><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>;
  if (name === "list") return <svg viewBox="0 0 24 24" {...p}><path d="M4 6h16M4 12h16M4 18h10"/></svg>;
  if (name === "cal") return <svg viewBox="0 0 24 24" {...p}><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 11h16"/></svg>;
  if (name === "chart") return <svg viewBox="0 0 24 24" {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>;
  return <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>;
}

export default function Nav() {
  const path = usePathname() || "/";
  return (
    <>
      <div className="brand">Finora</div>
      <nav className="bottom">
        {ITEMS.map(it => {
          const on = !it.soon && (it.href === "/" ? path === "/" : path.startsWith(it.href));
          const cls = on ? "on" : "";
          return it.soon ? (
            <a key={it.href} className={cls} aria-disabled="true" title="Скоро">
              <span className="ic"><Icon name={it.icon} /></span>
              {it.label}<span className="soon">скоро</span>
            </a>
          ) : (
            <Link key={it.href} href={it.href} className={cls}>
              <span className="ic"><Icon name={it.icon} /></span>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
