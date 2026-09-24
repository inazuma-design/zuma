"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";

/** Form bound to a `(state, formData) => FormState` server action, showing its error/success message. */
export function ActionForm({
  action,
  submitLabel,
  className = "card space-y-3 p-5",
  children,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>{submitLabel}</button>
    </form>
  );
}
