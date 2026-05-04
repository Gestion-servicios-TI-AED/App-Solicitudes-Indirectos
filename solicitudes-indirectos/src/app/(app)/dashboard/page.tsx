import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { SolicitudBadge } from "@/components/solicitudes/SolicitudBadge";
import { TIPO_SOLICITUD_LABELS, formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  href?: string;
}) {
  const inner = (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 transition-colors hover:border-blue-200">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 leading-snug">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ESTADOS_ACTIVOS = [
  "ENVIADA",
  "APROBADA_DIRECTOR",
  "EN_REVISION",
  "EN_TRAMITE_CONTRATOS",
  "CREACION_MINUTA",
  "ENVIO_CONTRATO_POLIZAS",
  "EN_CONTROLES",
  "APROBACION_FINAL",
] as const;

const ROLES_VER_TODAS = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "ADMIN"];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const userRoles: string[] = session?.user?.roles ?? (session?.user?.rol ? [session.user.rol] : []);

  // Build role-based where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baseWhere: any = {};
  if (!userRoles.some((r) => ROLES_VER_TODAS.includes(r))) {
    baseWhere = { solicitanteId: userId };
  }

  // Stats
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let pendientesMiAprobacion = 0;
  if (userRoles.includes("ADMIN")) {
    pendientesMiAprobacion = await prisma.solicitud.count({ where: { estado: { in: [...ESTADOS_ACTIVOS] } } });
  } else if (userRoles.includes("DIRECTOR_CONTROLES")) {
    pendientesMiAprobacion = await prisma.solicitud.count({ where: { estado: "APROBACION_FINAL" } });
  } else if (userRoles.includes("CONTROLES")) {
    pendientesMiAprobacion = await prisma.solicitud.count({ where: { estado: "EN_CONTROLES" } });
  } else if (userRoles.includes("CONTRATOS")) {
    pendientesMiAprobacion = await prisma.solicitud.count({ where: { estado: { in: ["APROBADA_DIRECTOR", "EN_TRAMITE_CONTRATOS"] } } });
  } else if (userRoles.includes("DIRECTOR_PROYECTO")) {
    pendientesMiAprobacion = await prisma.solicitud.count({ where: { aprobadorId: userId, estado: "ENVIADA" } });
  }

  const [totalActivas, enRevision, completadasEsteMes, rawSolicitudes] = await Promise.all([
    prisma.solicitud.count({ where: { ...baseWhere, estado: { in: [...ESTADOS_ACTIVOS] } } }),
    prisma.solicitud.count({ where: { ...baseWhere, estado: "EN_REVISION" } }),
    prisma.solicitud.count({ where: { ...baseWhere, estado: "COMPLETADA", actualizadoEn: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
    prisma.solicitud.findMany({
      where: baseWhere,
      orderBy: { fechaSolicitud: "desc" },
      take: 10,
      select: {
        id: true,
        consecutivo: true,
        tipo: true,
        frentesIds: true,
        estado: true,
        fechaSolicitud: true,
        solicitante: { select: { nombre: true } },
        tercero: { select: { razonSocial: true } },
      },
    }),
  ]);

  const solicitudes = rawSolicitudes.map((s) => ({
    ...s,
    frentesIds: (() => { try { return JSON.parse(s.frentesIds as string) as number[]; } catch { return []; } })(),
  }));

  const userName = session?.user?.name ?? "Usuario";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard — Baia Kristal
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Bienvenido, {userName}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total solicitudes activas"
          value={totalActivas}
          icon={FileText}
          colorClass="bg-blue-50 text-blue-600"
          href="/solicitudes"
        />
        <StatCard
          label="Pendientes de mi aprobación"
          value={pendientesMiAprobacion}
          icon={Clock}
          colorClass="bg-yellow-50 text-yellow-600"
          href="/solicitudes?estado=ENVIADA"
        />
        <StatCard
          label="En revisión / devueltas"
          value={enRevision}
          icon={AlertCircle}
          colorClass="bg-red-50 text-red-600"
          href="/solicitudes?estado=DEVUELTA"
        />
        <StatCard
          label="Completadas este mes"
          value={completadasEsteMes}
          icon={CheckCircle2}
          colorClass="bg-green-50 text-green-600"
          href="/solicitudes?estado=COMPLETADA"
        />
      </div>

      {/* Recent solicitudes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Solicitudes recientes
          </h2>
          <Link
            href="/solicitudes"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Ver todas
            <ArrowRight size={14} />
          </Link>
        </div>

        {solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              No hay solicitudes aún
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Crea tu primera solicitud para comenzar el flujo de aprobación.
            </p>
            <Link
              href="/solicitudes/nueva"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Nueva Solicitud
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Consecutivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Frente(s)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tercero
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.map((sol) => (
                  <tr
                    key={sol.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/solicitudes/${sol.id}`}
                        className="text-sm font-mono font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {sol.consecutivo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {TIPO_SOLICITUD_LABELS[sol.tipo] ?? sol.tipo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {sol.frentesIds.length > 0
                        ? `${sol.frentesIds.length} frente${sol.frentesIds.length !== 1 ? "s" : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                      {sol.tercero?.razonSocial ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SolicitudBadge estado={sol.estado} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(sol.fechaSolicitud)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
