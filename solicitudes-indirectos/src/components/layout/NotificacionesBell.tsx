"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  url?: string | null;
  creadoEn: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificacionesBell() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const data = await res.json();
      setNotificaciones(data.notificaciones?.slice(0, 10) ?? []);
      setTotalNoLeidas(data.totalNoLeidas ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  // Initial fetch + poll every 30 seconds
  useEffect(() => {
    fetchNotificaciones();
    intervalRef.current = setInterval(fetchNotificaciones, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotificaciones]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleNotificacionClick(notif: Notificacion) {
    // Mark as read
    if (!notif.leida) {
      try {
        await fetch("/api/notificaciones", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id }),
        });
        setNotificaciones((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
        );
        setTotalNoLeidas((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (notif.url) router.push(notif.url);
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        setTotalNoLeidas(0);
      }
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  function formatRelative(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Ahora";
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days !== 1 ? "s" : ""}`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label={`Notificaciones${totalNoLeidas > 0 ? ` (${totalNoLeidas} sin leer)` : ""}`}
      >
        <Bell size={20} />
        {totalNoLeidas > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalNoLeidas > 99 ? "99+" : totalNoLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Notificaciones
            </h3>
            {totalNoLeidas > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
              >
                <CheckCheck size={13} />
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell size={28} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificacionClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !notif.leida ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notif.leida && (
                      <span className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                    <div className={`flex-1 min-w-0 ${notif.leida ? "pl-4" : ""}`}>
                      <p className="text-sm font-medium text-gray-900 leading-snug truncate">
                        {notif.titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                        {notif.mensaje}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelative(notif.creadoEn)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
