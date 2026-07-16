"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, DEMO_USER } from "@/lib/store";

export default function Login() {
  const { signIn } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const e = signIn(email, password);
    if (e) return setErr(e);
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white text-xl font-bold text-ink">M</div>
          <div className="mt-4 text-[15px] font-bold tracking-[0.28em] text-white">MIRAGGIO</div>
          <div className="mt-1 text-[10px] tracking-[0.3em] text-gray-400">INVENTORY CONTROL TOWER</div>
        </div>

        <div className="rounded-xl2 bg-white p-6 shadow-lg">
          <div className="text-[15px] font-bold">Sign in</div>
          <p className="mt-0.5 text-[12px] text-sub">One team, one login — full access to the control tower.</p>

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-sub">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="supply@miraggio.com"
            className="mt-1 w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-sub">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mt-1 w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />

          {err && <p className="mt-2.5 text-[12px] font-semibold text-crit">{err}</p>}

          <button onClick={submit}
            className="mt-4 w-full rounded-lg bg-ink py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90">
            Sign in
          </button>

          <button onClick={() => { setEmail(DEMO_USER.email); setPassword(DEMO_USER.password); setErr(null); }}
            className="mt-2 w-full rounded-lg border border-line bg-white py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
            Fill demo credentials
          </button>

          <p className="mt-3 text-center text-[11px] text-gray-400">
            {DEMO_USER.email} · password “miraggio”
          </p>
        </div>
      </div>
    </div>
  );
}
