"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ObligationForm from "../../src/ui/ObligationForm";
import { useAppState } from "../../src/ui/useAppState";

export default function EditPage() {
  return <Suspense fallback={null}><EditInner /></Suspense>;
}

function EditInner() {
  const { st, ready } = useAppState();
  const params = useSearchParams();
  if (!ready || !st) return null;
  const ob = st.obligations.find(o => o.id === Number(params.get("id")));
  if (!ob) return <p className="mut">Обязательство не найдено.</p>;
  return <ObligationForm key={ob.id} ob={ob} />;
}
