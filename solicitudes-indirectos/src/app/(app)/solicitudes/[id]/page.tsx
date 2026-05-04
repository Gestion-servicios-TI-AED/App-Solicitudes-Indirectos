import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Calendar,
  Building2,
  FileText,
  Clock,
  DollarSign,
  Hash,
  Paperclip,
} from "lucide-react";
import { SolicitudBadge } from "@/components/solicitudes/SolicitudBadge";
import { SolicitudActions } from "@/components/solicitudes/SolicitudActions";
import { EstadoTimeline } from "@/components/solicitudes/EstadoTimeline";
import {
  TIPO_SOLICITUD_LABELS,
  ESTADO_LABELS,
  ACCION_LABELS,
  ACCION_COLOR,
  ACCION_ESTADO_DESTINO,
  ROL_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 shrink-0">
          <Icon size={13} className="text-gray-500" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-900 leading-snug">
          {value ?? <span className="text-gray-400 italic">—</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SolicitudDetallePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const raw = await prisma.solicitud.findUnique({
    where: { id: Number(id) },
    include: {
      solicitante: { select: { id: true, nombre: true, email: true, cargo: true } },
      aprobador: { select: { id: true, nombre: true, rol: true } },
      tercero: { select: { id: true, razonSocial: true, nit: true } },
      historial: {
        orderBy: { fecha: "asc" },
        include: { usuario: { select: { nombre: true, rol: true } } },
      },
    },
  });

  if (!raw) notFound();

  const parsedFrentesIds: number[] = (() => { try { return JSON.parse(raw.frentesIds as string); } catch { return []; } })();

  const [proyecto, frentes] = await Promise.all([
    prisma.proyecto.findUnique({ where: { id: raw.proyectoId }, select: { nombre: true } }),
    parsedFrentesIds.length > 0
      ? prisma.frente.findMany({ where: { id: { in: parsedFrentesIds } }, select: { id: true, nombre: true } })
      : Promise.resolve([]),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solicitud: any = {
    ...raw,
    frentesIds: parsedFrentesIds,
    proyectoNombre: proyecto?.nombre ?? `Proyecto #${raw.proyectoId}`,
    frentesNombres: frentes.map((f) => f.nombre),
  };

  const archivos = [
    { label: "Cuadro Comparativo", path: solicitud.archivoCuadroComparativo },
    { label: "Cotización", path: solicitud.archivoCotizacion },
    { label: "Formato de Solicitud", path: solicitud.archivoFormatoSolicitud },
    { label: "BEP", path: solicitud.archivoBEP },
  ].filter((a) => a.path);

  const anexos: { url: string; nombre: string }[] = (() => {
    try { return JSON.parse(solicitud.archivosAnexos || "[]"); } catch { return []; }
  })();

  const historial = solicitud.historial ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href="/solicitudes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a Solicitudes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900">
              {solicitud.consecutivo}
            </h1>
            <SolicitudBadge estado={solicitud.estado} />
            <span className="text-sm text-gray-500">
              {TIPO_SOLICITUD_LABELS[solicitud.tipo] ?? solicitud.tipo}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <EstadoTimeline estadoActual={solicitud.estado} historial={historial} />

      {/* Action buttons */}
      <SolicitudActions
        solicitud={{
          id: solicitud.id,
          estado: solicitud.estado,
          solicitanteId: solicitud.solicitanteId,
          aprobadorId: solicitud.aprobadorId,
          consecutivo: solicitud.consecutivo,
          archivosAnexos: solicitud.archivosAnexos,
        }}
        userSession={session}
      />

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Solicitante y fechas */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Información del Solicitante
          </h2>
          <InfoRow
            label="Solicitante"
            value={solicitud.solicitante?.nombre}
            icon={User}
          />
          <InfoRow
            label="Cargo"
            value={solicitud.solicitante?.cargo}
            icon={Building2}
          />
          <InfoRow
            label="Correo"
            value={solicitud.solicitante?.email}
            icon={FileText}
          />
          <InfoRow
            label="Fecha de solicitud"
            value={formatDate(solicitud.fechaSolicitud)}
            icon={Calendar}
          />
          {solicitud.fechaAprobacionDirector && (
            <InfoRow
              label="Fecha aprobación director"
              value={formatDate(solicitud.fechaAprobacionDirector)}
              icon={Calendar}
            />
          )}
          {solicitud.aprobador && (
            <InfoRow
              label="Director aprobador"
              value={solicitud.aprobador.nombre}
              icon={User}
            />
          )}
        </div>

        {/* Proyecto y frentes */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Proyecto y Frentes
          </h2>
          <InfoRow
            label="Proyecto"
            value={solicitud.proyectoNombre}
            icon={Building2}
          />
          <InfoRow
            label="Frentes"
            value={
              solicitud.frentesNombres?.length > 0
                ? solicitud.frentesNombres.join(", ")
                : "—"
            }
            icon={Hash}
          />
          {solicitud.numeroContratoAdpro && (
            <InfoRow
              label="N° Contrato Adpro"
              value={solicitud.numeroContratoAdpro}
              icon={Hash}
            />
          )}
        </div>
      </div>

      {/* Datos del formulario */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Datos de la Solicitud
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {solicitud.tercero && (
            <InfoRow
              label="Tercero"
              value={
                <Link
                  href={`/terceros/${solicitud.tercero.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {solicitud.tercero.razonSocial} — {solicitud.tercero.nit}
                </Link>
              }
              icon={Building2}
            />
          )}
          {solicitud.tipoContrato && (
            <InfoRow
              label="Tipo de Contrato"
              value={solicitud.tipoContrato === "DISENO" ? "Diseño" : solicitud.tipoContrato}
              icon={FileText}
            />
          )}
          {solicitud.plazoEjecucion && (
            <InfoRow
              label="Plazo de Ejecución"
              value={solicitud.plazoEjecucion}
              icon={Clock}
            />
          )}
          {solicitud.valorFinal != null && (
            <InfoRow
              label="Valor Final"
              value={formatCurrency(solicitud.valorFinal)}
              icon={DollarSign}
            />
          )}
          {solicitud.asunto && (
            <InfoRow label="Asunto" value={solicitud.asunto} icon={FileText} />
          )}
          {solicitud.formaPago && (
            <InfoRow
              label="Forma de Pago"
              value={solicitud.formaPago}
              icon={DollarSign}
            />
          )}
        </div>

        {solicitud.descripcionActividad && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
              Descripción de Actividad
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {solicitud.descripcionActividad}
            </p>
          </div>
        )}

        {solicitud.alcance && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
              Alcance
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {solicitud.alcance}
            </p>
          </div>
        )}

        {solicitud.condicionesEspeciales && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
              Condiciones Especiales
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {solicitud.condicionesEspeciales}
            </p>
          </div>
        )}
      </div>

      {/* Nota de Contratación */}
      {solicitud.notaContratacion && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-yellow-800 mb-2">
            Nota de Contratación / Revisión
          </h2>
          <p className="text-sm text-yellow-900 whitespace-pre-wrap">
            {solicitud.notaContratacion}
          </p>
        </div>
      )}

      {/* Archivos adjuntos */}
      {(archivos.length > 0 || anexos.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Documentos Adjuntos
          </h2>
          <ul className="space-y-2">
            {archivos.map((a) => (
              <li key={a.label} className="flex items-center gap-3">
                <Paperclip size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
                <a
                  href={a.path!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline ml-auto"
                >
                  Descargar
                </a>
              </li>
            ))}
            {anexos.length > 0 && (
              <>
                {(archivos.length > 0) && (
                  <li className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Anexos de la solicitud</p>
                  </li>
                )}
                {anexos.map((a, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Paperclip size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{a.nombre}</span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline ml-auto shrink-0"
                    >
                      Descargar
                    </a>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Historial de Seguimiento
        </h2>

        {historial.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin registros en el historial.</p>
        ) : (
          <ol className="relative border-l-2 border-gray-100 space-y-6 ml-3">
            {historial.map(
              (entry: {
                id: number;
                accion: string;
                nota?: string | null;
                fecha: string;
                usuario: { nombre: string; rol: string };
              }) => {
                const dotColor = ACCION_COLOR[entry.accion] ?? "bg-gray-400";
                const label = ACCION_LABELS[entry.accion] ?? entry.accion;
                const estadoDestino = ACCION_ESTADO_DESTINO[entry.accion];
                const rolLabel = ROL_LABELS[entry.usuario.rol] ?? entry.usuario.rol;
                const isNegative = entry.accion === "DEVOLVER" || entry.accion === "REVISAR";

                return (
                  <li key={entry.id} className="ml-5 relative">
                    <div className={`absolute -left-[1.625rem] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${dotColor}`} />
                    <div className="flex flex-col gap-0.5">
                      {/* Timestamp */}
                      <p className="text-xs text-gray-400 font-mono">
                        {formatDateTime(entry.fecha)}
                      </p>
                      {/* Acción */}
                      <p className={`text-sm font-semibold ${isNegative ? "text-red-700" : "text-gray-900"}`}>
                        {label}
                      </p>
                      {/* Usuario + rol */}
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{entry.usuario.nombre}</span>
                        <span className="mx-1">·</span>
                        <span>{rolLabel}</span>
                      </p>
                      {/* Estado resultante */}
                      {estadoDestino && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Estado resultante:{" "}
                          <span className="font-medium text-gray-600">
                            {ESTADO_LABELS[estadoDestino] ?? estadoDestino}
                          </span>
                        </p>
                      )}
                      {/* Nota */}
                      {entry.nota && (
                        <p className={`text-sm mt-1 px-3 py-2 rounded-lg border-l-4 ${
                          isNegative
                            ? "bg-red-50 border-red-300 text-red-800"
                            : "bg-gray-50 border-gray-300 text-gray-700"
                        }`}>
                          {entry.nota}
                        </p>
                      )}
                    </div>
                  </li>
                );
              }
            )}
          </ol>
        )}
      </div>
    </div>
  );
}
