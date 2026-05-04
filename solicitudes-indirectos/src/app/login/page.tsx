"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

const TEST_USERS = [
  { label: "Solicitante",          email: "smercado@baiak.com",    password: "Abc123!" },
  { label: "Director de Proyecto", email: "crodriguez@baiak.com",  password: "Abc123!" },
  { label: "Contratos",            email: "amorales@baiak.com",    password: "Abc123!" },
  { label: "Coord. Controles",     email: "ljimenez@baiak.com",    password: "Abc123!" },
  { label: "Director Controles",   email: "msuarez@baiak.com",     password: "Abc123!" },
  { label: "Admin",                email: "admin@baiak.com",       password: "Admin123!" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email:    email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Ocurrió un error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
      <h2 className="text-base font-semibold text-gray-900 mb-6 text-center">
        Iniciar sesión
      </h2>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-5 text-sm text-red-700"
        >
          <span className="font-semibold shrink-0">✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@baiak.com"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
        >
          {loading && <Spinner size="sm" className="text-white" />}
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      {/* Test users quick-access */}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Usuarios de prueba
        </p>
        <div className="space-y-1.5">
          {TEST_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => { setEmail(u.email); setPassword(u.password); }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">
                {u.label}
              </span>
              <span className="text-xs text-gray-400 font-mono group-hover:text-blue-500">
                {u.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg mb-4">
            <span className="text-white text-xl font-bold tracking-tight">BK</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Baia Kristal</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de Solicitudes Indirectos</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8"><Spinner size="lg" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Baia Kristal — Uso interno
        </p>
      </div>
    </div>
  );
}
