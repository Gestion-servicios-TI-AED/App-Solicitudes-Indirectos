"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { User, Lock, Save } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ROL_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  cargo: string | null;
  telefono: string | null;
  rol: string;
  activo: boolean;
  creadoEn: string;
  frentesAsignados?: {
    frenteId: number;
    frente: { nombre: string; proyecto: { nombre: string } };
  }[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { data: session, update: updateSession } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Error al cargar perfil");
      const data: UserProfile = await res.json();
      setProfile(data);
      setNombre(data.nombre);
      setCargo(data.cargo ?? "");
      setTelefono(data.telefono ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          cargo: cargo || null,
          telefono: telefono || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar perfil");
      }
      const updated: UserProfile = await res.json();
      setProfile(updated);
      setProfileSuccess(true);
      // Update session name
      await updateSession({ name: updated.nombre });
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al cambiar contraseña");
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchProfile}
          className="text-sm text-blue-600 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const userName = session?.user?.name ?? profile?.nombre ?? "Usuario";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Información y configuración de tu cuenta
        </p>
      </div>

      {/* User summary card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shrink-0">
          {userName
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {profile?.nombre}
          </h2>
          <p className="text-sm text-gray-500 truncate">{profile?.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {ROL_LABELS[profile?.rol ?? ""] ?? profile?.rol}
            </span>
            {profile?.cargo && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                {profile.cargo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Frentes */}
      {profile?.frentesAsignados && profile.frentesAsignados.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Frentes asignados
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.frentesAsignados.map((fa) => (
              <span
                key={fa.frenteId}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {fa.frente.nombre}
                <span className="ml-1 text-gray-400">
                  — {fa.frente.proyecto.nombre}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Edit profile */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Editar información
          </h3>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          {profileError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Perfil actualizado correctamente.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cargo
            </label>
            <input
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu cargo"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingProfile ? <Spinner size="sm" /> : <Save size={14} />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Cambiar contraseña
          </h3>
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          {passwordError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Contraseña actualizada correctamente.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Contraseña actual <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nueva contraseña <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingPassword ? <Spinner size="sm" /> : <Lock size={14} />}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
