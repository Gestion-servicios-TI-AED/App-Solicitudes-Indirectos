"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  AlertCircle,
  FileUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { numeroALetras } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyectoId: number;
  proyecto: { id: number; nombre: string; activo: boolean };
  aprobadorConfig?: { aprobadorId: string } | null;
  usuarios?: { userId: string; frenteId: number }[];
}

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  aprobadoDebidaDiligencia: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Solicitud = Record<string, any>;

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((p) => !p)}
        className={`flex w-full items-center justify-between px-5 py-4 text-left ${
          collapsible ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
        }`}
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {collapsible &&
          (open ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          ))}
      </button>
      {(!collapsible || open) && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── File upload ──────────────────────────────────────────────────────────────

function FileField({
  label,
  required,
  accept,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir archivo");
      onChange(data.url);
      setFileName(file.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div
        className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${
          error ? "border-red-400" : "border-gray-300"
        } ${value ? "bg-green-50 border-green-300" : "bg-white"}`}
      >
        <FileUp size={16} className={value ? "text-green-600" : "text-gray-400"} />
        <span className="flex-1 truncate text-sm text-gray-600">
          {fileName || (value ? "Archivo cargado" : "Sin archivo")}
        </span>
        <label className="cursor-pointer shrink-0">
          <span className="text-xs font-medium text-blue-600 hover:text-blue-700">
            {uploading ? "Subiendo…" : value ? "Cambiar" : "Seleccionar"}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={handleFile}
            className="sr-only"
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditarSolicitudPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const solicitudId = params?.id;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [terceroSearch, setTerceroSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields (common)
  const [frentesIds, setFrentesIds] = useState<number[]>([]);
  const [terceroId, setTerceroId] = useState<number | "">("");
  const [descripcionActividad, setDescripcionActividad] = useState("");
  const [plazoEjecucion, setPlazoEjecucion] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [valorFinal, setValorFinal] = useState<string>("");
  const [asunto, setAsunto] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [alcance, setAlcance] = useState("");
  const [condicionesEspeciales, setCondicionesEspeciales] = useState("");

  // Files
  const [archivoCuadroComparativo, setArchivoCuadroComparativo] = useState("");
  const [archivoCotizacion, setArchivoCotizacion] = useState("");
  const [archivoBEP, setArchivoBEP] = useState("");
  const [archivoFormatoSolicitud, setArchivoFormatoSolicitud] = useState("");

  const [valorEnLetras, setValorEnLetras] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Load data ─────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!solicitudId) return;
    setLoadingData(true);
    setLoadError(null);
    try {
      const [solRes, frentesRes, tercerosRes] = await Promise.all([
        fetch(`/api/solicitudes/${solicitudId}`),
        fetch("/api/frentes"),
        fetch("/api/terceros?aprobado=true"),
      ]);

      if (!solRes.ok) {
        if (solRes.status === 404) throw new Error("Solicitud no encontrada");
        throw new Error("Error al cargar solicitud");
      }
      if (!frentesRes.ok) throw new Error("Error al cargar frentes");
      if (!tercerosRes.ok) throw new Error("Error al cargar terceros");

      const [solData, frentesData, tercerosData] = await Promise.all([
        solRes.json(),
        frentesRes.json(),
        tercerosRes.json(),
      ]);

      // Only BORRADOR can be edited from this page
      if (solData.estado !== "BORRADOR") {
        router.replace(`/solicitudes/${solicitudId}`);
        return;
      }

      setSolicitud(solData);
      setFreentes(Array.isArray(frentesData) ? frentesData : []);
      setTerceros(Array.isArray(tercerosData) ? tercerosData : []);

      // Pre-populate form
      setFrentesIds(solData.frentesIds ?? []);
      setTerceroId(solData.terceroId ?? "");
      setDescripcionActividad(solData.descripcionActividad ?? "");
      setPlazoEjecucion(solData.plazoEjecucion ?? "");
      setFormaPago(solData.formaPago ?? "");
      setValorFinal(solData.valorFinal != null ? String(solData.valorFinal) : "");
      setAsunto(solData.asunto ?? "");
      setTipoContrato(solData.tipoContrato ?? "");
      setAlcance(solData.alcance ?? "");
      setCondicionesEspeciales(solData.condicionesEspeciales ?? "");
      setArchivoCuadroComparativo(solData.archivoCuadroComparativo ?? "");
      setArchivoCotizacion(solData.archivoCotizacion ?? "");
      setArchivoBEP(solData.archivoBEP ?? "");
      setArchivoFormatoSolicitud(solData.archivoFormatoSolicitud ?? "");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoadingData(false);
    }
  }, [solicitudId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Valor en letras ───────────────────────────────────────────────────────────

  useEffect(() => {
    const num = parseFloat(valorFinal);
    if (!isNaN(num) && num > 0) {
      setValorEnLetras(numeroALetras(num));
    } else {
      setValorEnLetras("");
    }
  }, [valorFinal]);

  // ── Toggle frente ─────────────────────────────────────────────────────────────

  function toggleFrente(id: number) {
    setFrentesIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  // ── Build payload ─────────────────────────────────────────────────────────────

  function buildPayload() {
    const firstFrente = frentes.find((f) => frentesIds.includes(f.id));
    const proyectoId = firstFrente?.proyectoId ?? solicitud?.proyectoId;

    return {
      frentesIds,
      proyectoId,
      terceroId: terceroId !== "" ? Number(terceroId) : undefined,
      descripcionActividad,
      plazoEjecucion,
      formaPago,
      valorFinal: valorFinal ? parseFloat(valorFinal) : undefined,
      tipoContrato: tipoContrato || undefined,
      asunto,
      alcance: alcance || undefined,
      condicionesEspeciales: condicionesEspeciales || undefined,
      archivoCuadroComparativo: archivoCuadroComparativo || undefined,
      archivoCotizacion: archivoCotizacion || undefined,
      archivoBEP: archivoBEP || undefined,
      archivoFormatoSolicitud: archivoFormatoSolicitud || undefined,
    };
  }

  async function handleSave(sendAfter = false) {
    setSubmitError("");
    if (frentesIds.length === 0) {
      setSubmitError("Selecciona al menos un frente de trabajo");
      return;
    }
    if (sendAfter && !asunto) {
      setSubmitError("El asunto es obligatorio para enviar");
      return;
    }

    if (sendAfter) setSending(true);
    else setSaving(true);

    try {
      const payload = buildPayload();
      const res = await fetch(`/api/solicitudes/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar solicitud");
      }

      if (sendAfter) {
        // Send (change estado to ENVIADA)
        const sendRes = await fetch(`/api/solicitudes/${solicitudId}/estado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "ENVIAR" }),
        });
        if (!sendRes.ok) {
          const data = await sendRes.json();
          throw new Error(data.error ?? "Error al enviar solicitud");
        }
      }

      router.push(`/solicitudes/${solicitudId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
      setSending(false);
    }
  }

  // ── Filtered terceros ─────────────────────────────────────────────────────────

  const filteredTerceros = terceros.filter((t) => {
    if (!terceroSearch) return true;
    const q = terceroSearch.toLowerCase();
    return (
      t.razonSocial.toLowerCase().includes(q) ||
      t.nit.toLowerCase().includes(q)
    );
  });

  const isTipoContrato = solicitud?.tipo === "CONTRATO";

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <p className="text-sm text-red-600 mb-3">{loadError}</p>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!solicitud) return null;

  // Access check: only the owner or ADMIN can edit
  const userId = session?.user?.id;
  const userRole = session?.user?.rol;
  if (
    solicitud.solicitanteId !== userId &&
    userRole !== "ADMIN"
  ) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">
          No tienes permiso para editar esta solicitud.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/solicitudes/${solicitudId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al detalle
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Editar Solicitud
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {solicitud.consecutivo} — {solicitud.tipo}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || sending}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? <Spinner size="sm" /> : <Save size={14} />}
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || sending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? <Spinner size="sm" /> : <Send size={14} />}
              Guardar y enviar
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* ── Section 1: Frentes ──────────────────────────────────────────────── */}
      <Section title="1. Frentes de trabajo">
        {frentes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Cargando frentes…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {frentes.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={frentesIds.includes(f.id)}
                  onChange={() => toggleFrente(f.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {f.nombre}
                  <span className="ml-1 text-xs text-gray-400">
                    ({f.proyecto.nombre})
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      {/* ── Section 2: Tercero / Contratista ─────────────────────────────────── */}
      <Section title="2. Contratista">
        <div className="space-y-3">
          <input
            type="search"
            placeholder="Buscar por razón social o NIT…"
            value={terceroSearch}
            onChange={(e) => setTerceroSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={terceroId}
            onChange={(e) =>
              setTerceroId(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Seleccionar contratista —</option>
            {filteredTerceros.map((t) => (
              <option key={t.id} value={t.id}>
                {t.razonSocial} — {t.nit}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* ── Section 3: Descripción y condiciones ──────────────────────────────── */}
      <Section title="3. Descripción y condiciones">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción de la actividad{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcionActividad}
              onChange={(e) => setDescripcionActividad(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Descripción detallada de las actividades a realizar (mín. 50 caracteres)…"
            />
            <p className="text-xs text-gray-400 mt-1">
              {descripcionActividad.length} caracteres
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plazo de ejecución <span className="text-red-500">*</span>
              </label>
              <input
                value={plazoEjecucion}
                onChange={(e) => setPlazoEjecucion(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 3 meses"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de pago <span className="text-red-500">*</span>
              </label>
              <input
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Contra entregables"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor final (COP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={valorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              min={0}
            />
            {valorEnLetras && (
              <p className="text-xs text-gray-500 mt-1 italic">
                {valorEnLetras}
              </p>
            )}
          </div>

          {isTipoContrato && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de contrato
              </label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Seleccionar —</option>
                <option value="OBRA">Obra</option>
                <option value="DISENO">Diseño</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asunto
            </label>
            <input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Asunto de la solicitud"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alcance
            </label>
            <textarea
              value={alcance}
              onChange={(e) => setAlcance(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Alcance del trabajo…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condiciones especiales
            </label>
            <textarea
              value={condicionesEspeciales}
              onChange={(e) => setCondicionesEspeciales(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Condiciones especiales, si aplica…"
            />
          </div>
        </div>
      </Section>

      {/* ── Section 4: Documentos adjuntos ───────────────────────────────────── */}
      <Section title="4. Documentos adjuntos" collapsible defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileField
            label="Cuadro Comparativo"
            accept=".pdf,.xlsx,.xls"
            value={archivoCuadroComparativo}
            onChange={setArchivoCuadroComparativo}
          />
          <FileField
            label="Cotización"
            accept=".pdf,.xlsx,.xls"
            value={archivoCotizacion}
            onChange={setArchivoCotizacion}
          />
          <FileField
            label="Formato de Solicitud"
            accept=".pdf,.docx,.doc"
            value={archivoFormatoSolicitud}
            onChange={setArchivoFormatoSolicitud}
          />
          {isTipoContrato && (
            <FileField
              label="BEP"
              accept=".pdf,.xlsx,.xls"
              value={archivoBEP}
              onChange={setArchivoBEP}
            />
          )}
        </div>
      </Section>

      {/* Bottom action bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(`/solicitudes/${solicitudId}`)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || sending}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {saving ? <Spinner size="sm" /> : <Save size={14} />}
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving || sending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {sending ? <Spinner size="sm" /> : <Send size={14} />}
          Guardar y enviar
        </button>
      </div>
    </div>
  );
}
