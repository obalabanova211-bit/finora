"use client";

import { useParams } from "next/navigation";
import ObligationForm from "../../../src/ui/ObligationForm";
import { useAppState } from "../../../src/ui/useAppState";

export default function EditPage() {
  const { st, ready } = useAppState();
  const params = useParams<{ id: string }>();
  if (!ready || !st) return null;
  const ob = st.obligations.find(o => o.id === Number(params.id));
  if (!ob) return <p className="mut">Обязательство не найдено.</p>;
  return <ObligationForm key={ob.id} ob={ob} />;
}
