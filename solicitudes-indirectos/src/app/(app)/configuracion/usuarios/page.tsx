"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, UserCheck, UserX, X, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ROL_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyecto: { id: number; nombre: string };
}

interface User {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  roles: string[];
  activo: boolean;
  frentesAsignados?: {
    frenteId: number;
    frente: { id: number; nombre: string; proyecto: { nombre: string } };
  }[];
}

interface FormData {
  nombre: string;
  cargo: string;
  email: string;
  telefono: string;
  roles: string[];
  password: string;
  frentesIds: number[];
}

const EMPTY_FORM: FormData = {
  nombre: "",
  cargo: "",
  email: "",
  telefono: "",
  roles: ["SOLICITANTE"],
  password: "",
  frentesIds: [],
};

const ROL_OPTIONS = Object.entries(ROL_LABELS);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [users, setUsers] = useState<User[]>([]);
  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, frentesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/frentes"),
      ]);
      if (!usersRes.ok) throw new Error("Error al cargar usuarios");
      if (!frentesRes.ok) throw new Error("Error al cargar frentes");
      const [usersData, frentesData] = await Promise.all([
        usersRes.json(),
        frentesRes.json(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setFreentes(Array.isArray(frentesData) ? frentesData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openNew() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      nombre: user.nombre,
      cargo: user.cargo ?? "",
      email: user.email,
      telefono: user.telefono ?? "",
      roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ["SOLICITANTE"],
      password: "",
      frentesIds: user.frentesAsignados?.map((fa) => fa.frenteId) ?? [],
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function toggleFrente(id: number) {
    setForm((prev) => ({
      ...prev,
      frentesIds: prev.frentesIds.includes(id)
        ? prev.frentesIds.filter((f) => f !== id)
        : [...prev.frentesIds, id],
    }));
  }

  function toggleRol(rol: string) {
    setForm((prev) => {
      const has = prev.roles.includes(rol);
      if (has && prev.roles.length === 1) return prev; // keep at least one
      return {
        ...prev,
        roles: has ? prev.roles.filter((r) => r !== rol) : [...prev.roles, rol],
      };
    });
  }

  const needsFrente =
    form.roles.includes("SOLICITANTE") || form.roles.includes("DIRECTOR_PROYECTO");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      let res: Response;
      if (editingUser) {
        const body: Record<string, unknown> = {
          nombre: form.nombre,
          cargo: form.cargo || null,
          telefono: form.telefono || null,
          roles: form.roles,
          frentesIds: form.frentesIds,
        };
        res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const body: Record<string, unknown> = {
          nombre: form.nombre,
          cargo: form.cargo || null,
          email: form.email,
          telefono: form.telefono || null,
          roles: form.roles,
          password: form.password,
          frentesIds: form.frentesIds,
        };
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar usuario");
      }
      closeModal();
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(user: User) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !user.activo }),
      });
      if (!res.ok) throw new Error();
      fetchData();
    } catch {
      alert("Error al cambiar estado del usuario");
    }
  }

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No tienes permiso para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios y Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de usuarios del sistema
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-sm text-gray-400 italic">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {["Nombre", "Cargo", "Email", "Teléfono", "Perfiles", "Estado", "Frentes", "Acciones"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {user.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {user.cargo ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {user.telefono ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(user.roles) ? user.roles : []).map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap"
                          >
                            {ROL_LABELS[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.activo
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {user.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                      {user.frentesAsignados && user.frentesAsignados.length > 0 ? (
                        <span className="text-xs">
                          {user.frentesAsignados
                            .map((fa) => fa.frente.nombre)
                            .join(", ")}
                        </span>
                      ) : (
                        <span className="text-gray-300 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActivo(user)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            user.activo
                              ? "text-red-600 bg-red-50 hover:bg-red-100"
                              : "text-green-600 bg-green-50 hover:bg-green-100"
                          }`}
                          title={user.activo ? "Desactivar" : "Activar"}
                        >
                          {user.activo ? <UserX size={12} /> : <UserCheck size={12} />}
                          {user.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-base font-semibold text-gray-900">
                  {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {formError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        value={form.nombre}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, nombre: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cargo
                      </label>
                      <input
                        value={form.cargo}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, cargo: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ingeniero Civil"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, email: e.target.value }))
                        }
                        disabled={!!editingUser}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                        placeholder="juan@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        value={form.telefono}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, telefono: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+57 300 000 0000"
                      />
                    </div>
                    {!editingUser && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Contraseña <span className="text-red-500">*</span>
                        </label>
                        <input
                          required={!editingUser}
                          type="password"
                          value={form.password}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, password: e.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="••••••••"
                          minLength={6}
                        />
                      </div>
                    )}
                  </div>

                  {/* Roles — multi-checkbox */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Perfiles <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ROL_OPTIONS.map(([value, label]) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5"
                        >
                          <input
                            type="checkbox"
                            checked={form.roles.includes(value)}
                            onChange={() => toggleRol(value)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                    {form.roles.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Selecciona al menos un perfil.
                      </p>
                    )}
                  </div>

                  {/* Frentes — only for SOLICITANTE and DIRECTOR_PROYECTO */}
                  {needsFrente ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Proyectos y Frentes asignados
                      </label>
                      {frentes.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No hay frentes disponibles.</p>
                      ) : (() => {
                        // Group frentes by project
                        const byProj: Record<string, { nombre: string; items: Frente[] }> = {};
                        for (const f of frentes) {
                          const k = String(f.proyecto.id);
                          if (!byProj[k]) byProj[k] = { nombre: f.proyecto.nombre, items: [] };
                          byProj[k].items.push(f);
                        }
                        return (
                          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                            {Object.values(byProj).map((group) => (
                              <div key={group.nombre} className="px-3 py-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{group.nombre}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {group.items.map((f) => (
                                    <label key={f.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                      <input
                                        type="checkbox"
                                        checked={form.frentesIds.includes(f.id)}
                                        onChange={() => toggleFrente(f.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-xs text-gray-700">{f.nombre}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-xs text-blue-700">
                        Los perfiles seleccionados tienen acceso a todas las solicitudes. No requieren asignación de proyectos o frentes.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || form.roles.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving && <Spinner size="sm" />}
                    {editingUser ? "Guardar cambios" : "Crear usuario"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
