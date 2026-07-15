"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, DEMO_USERS } from "@/lib/store";
import { roleHome, ROLE_LABEL } from "@/components/ui";

export default function Login() {
  const { signIn } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const e = signIn(email, password);
    if (e) return setErr(e);
    const u = DEMO_USERS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())!;
    router.replace(roleHome(u.role));
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
          <p className="mt-0.5 text-[12px] text-sub">Demo access — pick a role or type the credentials.</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {DEMO_USERS.map((u) => (
              <button key={u.email}
                onClick={() => { setEmail(u.email); setPassword(u.password); setErr(null); }}
                className={`rounded-lg border px-2 py-2 text-[10px] font-bold tracking-wide transition-colors ${
                  email === u.email ? "border-ink bg-ink text-white" : "border-line bg-white text-gray-600 hover:border-gray-300"}`}>
                {ROLE_LABEL[u.role]}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-sub">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@miraggio.com"
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

          <p className="mt-3 text-center text-[11px] text-gray-400">
            admin / supply / fulfillment @miraggio.com · password “miraggio”
          </p>
        </div>
      </div>
    </div>
  );
}
