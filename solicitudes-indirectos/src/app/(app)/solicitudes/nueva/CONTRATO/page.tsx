"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  FileUp,
  ArrowLeft,
  Save,
  Send,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { CronogramaBuilder, type CronogramaData } from "@/components/forms/CronogramaBuilder";
import { formatDate, formatCurrency, numeroALetras } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyectoId: number;
  proyecto: { id: number; nombre: string; activo: boolean };
  aprobadorConfig?: { id: number; aprobadorId: string; frenteId: number } | null;
  usuarios?: { userId: string; frenteId: number }[];
}

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  aprobadoDebidaDiligencia: boolean;
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  frentesIds: z.array(z.number()).min(1, "Selecciona al menos un frente de trabajo"),
  terceroId: z.number({ error: "Selecciona un contratista" }).positive("Selecciona un contratista"),
  tipoContrato: z.enum(["OBRA", "DISENO"] as const, { error: "Selecciona el tipo de contrato" }),
  descripcionActividad: z.string().min(50, "La descripción debe tener al menos 50 caracteres"),
  plazoEjecucion: z.string().min(1, "El plazo de ejecución es obligatorio"),
  formaPago: z.string().min(1, "La forma de pago es obligatoria"),
  valorFinal: z.number({ error: "Ingresa un valor válido" }).positive("El valor debe ser mayor a 0"),
  asunto: z.string().min(1, "El asunto es obligatorio"),
  // Sección 5 sub-form
  creacionTercero: z.boolean(),
  contratanteNombre: z.string().min(1, "El nombre del contratante es obligatorio"),
  contratanteNit: z.string().min(1, "El NIT del contratante es obligatorio"),
  alcance: z.string().optional(),
  condicionesEspeciales: z.string().optional(),
  // Documentos checklist
  docTerminosReferencia: z.boolean(),
  docCamaraComercio: z.boolean(),
  docEstadosFinancieros: z.boolean(),
  docEstadoResultados: z.boolean(),
  docSagrilaft: z.boolean(),
  docComposicionAccionaria: z.boolean(),
  docRut: z.boolean(),
  docCedulaRepresentante: z.boolean(),
  docCertificacionBancaria: z.boolean(),
  docCotizacion: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Docs checklist items ─────────────────────────────────────────────────────

const DOC_ITEMS = [
  { key: "docTerminosReferencia", label: "Términos de referencia / Especificaciones técnicas" },
  { key: "docCamaraComercio", label: "Cámara de comercio" },
  { key: "docEstadosFinancieros", label: "Estados financieros" },
  { key: "docEstadoResultados", label: "Estado de resultados" },
  { key: "docSagrilaft", label: "SAGRILAFT / Formulario de vinculación" },
  { key: "docComposicionAccionaria", label: "Composición accionaria" },
  { key: "docRut", label: "RUT" },
  { key: "docCedulaRepresentante", label: "Cédula del representante legal" },
  { key: "docCertificacionBancaria", label: "Certificación bancaria" },
  { key: "docCotizacion", label: "Cotización" },
] as const;

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
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
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {badge && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        {collapsible &&
          (open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />)}
      </button>
      {(!collapsible || open) && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">{children}</div>
      )}
    </div>
  );
}

// ─── File Upload Field ────────────────────────────────────────────────────────

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
  const [fileName, setFileName] = useState<string>("");

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
    } catch (err: unknown) {
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

// ─── Default cronograma ───────────────────────────────────────────────────────

const defaultCronograma: CronogramaData = {
  tieneFases: false,
  fechaInicio: "",
  fechaFin: "",
  fases: [],
  actividades: [{ descripcion: "", fechaInicio: "", fechaFin: "" }],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevaContratoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Data state ────────────────────────────────────────────────────────────────
  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [terceroSearch, setTerceroSearch] = useState("");
  const [loadingFreentes, setLoadingFreentes] = useState(true);
  const [loadingTerceros, setLoadingTerceros] = useState(true);

  // ── File state ────────────────────────────────────────────────────────────────
  const [archivoCuadroComparativo, setArchivoCuadroComparativo] = useState("");
  const [archivoCotizacion, setArchivoCotizacion] = useState("");
  const [archivoBEP, setArchivoBEP] = useState("");
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  // ── Cronograma state ──────────────────────────────────────────────────────────
  const [cronograma, setCronograma] = useState<CronogramaData>(defaultCronograma);

  // ── Submission state ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Valor en letras (derived) ─────────────────────────────────────────────────
  const [valorEnLetras, setValorEnLetras] = useState("");

  // ── Selected tercero ──────────────────────────────────────────────────────────
  const [selectedTercero, setSelectedTercero] = useState<Tercero | null>(null);

  // ─── Form ────────────────────────────────────────────────────────────────────

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      frentesIds: [],
      tipoContrato: undefined,
      descripcionActividad: "",
      plazoEjecucion: "",
      formaPago: "",
      valorFinal: undefined,
      asunto: "",
      creacionTercero: false,
      contratanteNombre: "AED CONSTRUCTORES S.A.S",
      contratanteNit: "901237628-1",
      alcance: "",
      condicionesEspeciales: "",
      docTerminosReferencia: false,
      docCamaraComercio: false,
      docEstadosFinancieros: false,
      docEstadoResultados: false,
      docSagrilaft: false,
      docComposicionAccionaria: false,
      docRut: false,
      docCedulaRepresentante: false,
      docCertificacionBancaria: false,
      docCotizacion: false,
    },
  });

  // ── Watched values ────────────────────────────────────────────────────────────
  const watchFrentesIds = watch("frentesIds");
  const watchTerceroId = watch("terceroId");
  const watchTipoContrato = watch("tipoContrato");
  const watchDescripcion = watch("descripcionActividad");
  const watchValorFinal = watch("valorFinal");

  // ── Fetch frentes ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/frentes")
      .then((r) => r.json())
      .then((data: Frente[]) => {
        // Filter by user assignment unless admin/contratos
        const rol = session?.user?.rol;
        if (rol === "ADMIN" || rol === "CONTRATOS" || rol === "CONTROLES" || rol === "DIRECTOR_CONTROLES") {
          setFreentes(data);
        } else {
          const userId = session?.user?.id;
          const assigned = data.filter((f) =>
            f.usuarios?.some((u) => u.userId === userId)
          );
          setFreentes(assigned.length > 0 ? assigned : data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFreentes(false));
  }, [session]);

  // ── Fetch terceros ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/terceros?aprobado=true")
      .then((r) => r.json())
      .then(setTerceros)
      .catch(console.error)
      .finally(() => setLoadingTerceros(false));
  }, []);

  // ── Auto-update valor en letras ───────────────────────────────────────────────
  useEffect(() => {
    if (watchValorFinal && watchValorFinal > 0) {
      setValorEnLetras(numeroALetras(watchValorFinal));
    } else {
      setValorEnLetras("");
    }
  }, [watchValorFinal]);

  // ── Auto-update selected tercero ──────────────────────────────────────────────
  useEffect(() => {
    const t = terceros.find((t) => t.id === watchTerceroId) ?? null;
    setSelectedTercero(t);
  }, [watchTerceroId, terceros]);

  // ── Auto-update asunto ────────────────────────────────────────────────────────
  useEffect(() => {
    const frenteNames = frentes
      .filter((f) => watchFrentesIds?.includes(f.id))
      .map((f) => f.nombre)
      .join(", ");
    const terceroName = selectedTercero?.razonSocial ?? "";
    const desc = watchDescripcion?.slice(0, 80) ?? "";
    if (frenteNames || terceroName || desc) {
      const autoAsunto = `[CONTRATO] – ${frenteNames || "Frente(s)"} – ${terceroName || "Contratista"} – ${desc}`;
      setValue("asunto", autoAsunto, { shouldValidate: false });
    }
  }, [watchFrentesIds, selectedTercero, watchDescripcion, frentes, setValue]);

  // ── Filtered terceros ─────────────────────────────────────────────────────────
  const filteredTerceros = terceros.filter((t) => {
    if (!terceroSearch) return true;
    const q = terceroSearch.toLowerCase();
    return t.razonSocial.toLowerCase().includes(q) || t.nit.toLowerCase().includes(q);
  });

  // ── Validate files ────────────────────────────────────────────────────────────
  function validateFiles(): boolean {
    const errs: Record<string, string> = {};
    if (!archivoCuadroComparativo) errs.cuadroComparativo = "El cuadro comparativo es obligatorio";
    if (!archivoCotizacion) errs.cotizacion = "La cotización es obligatoria";
    if (watchTipoContrato === "DISENO" && !archivoBEP) {
      errs.bep = "El BEP es obligatorio para contratos de diseño";
    }
    setFileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Build payload ─────────────────────────────────────────────────────────────
  function buildPayload(data: FormValues) {
    // Find proyectoId from first selected frente
    const firstFrente = frentes.find((f) => data.frentesIds.includes(f.id));
    const proyectoId = firstFrente?.proyectoId ?? 1;

    return {
      tipo: "CONTRATO",
      proyectoId,
      frentesIds: data.frentesIds,
      terceroId: data.terceroId,
      descripcionActividad: data.descripcionActividad,
      plazoEjecucion: data.plazoEjecucion,
      formaPago: data.formaPago,
      valorFinal: data.valorFinal,
      tipoContrato: data.tipoContrato,
      asunto: data.asunto,
      creacionTercero: data.creacionTercero,
      contratanteNombre: data.contratanteNombre,
      contratanteNit: data.contratanteNit,
      alcance: data.alcance,
      condicionesEspeciales: data.condicionesEspeciales,
      valorEnLetras,
      // Docs
      docTerminosReferencia: data.docTerminosReferencia,
      docCamaraComercio: data.docCamaraComercio,
      docEstadosFinancieros: data.docEstadosFinancieros,
      docEstadoResultados: data.docEstadoResultados,
      docSagrilaft: data.docSagrilaft,
      docComposicionAccionaria: data.docComposicionAccionaria,
      docRut: data.docRut,
      docCedulaRepresentante: data.docCedulaRepresentante,
      docCertificacionBancaria: data.docCertificacionBancaria,
      docCotizacion: data.docCotizacion,
      // Files
      archivoCuadroComparativo,
      archivoCotizacion,
      archivoBEP: archivoBEP || null,
    };
  }

  // ── Save cronograma ───────────────────────────────────────────────────────────
  async function saveCronograma(solicitudId: number) {
    if (!cronograma.fechaInicio || !cronograma.fechaFin) return;
    const res = await fetch(`/api/solicitudes/${solicitudId}/cronograma`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cronograma),
    });
    if (!res.ok) {
      const d = await res.json();
      console.error("Error guardando cronograma:", d.error);
    }
  }

  // ── Submit: Guardar Borrador ──────────────────────────────────────────────────
  async function onSaveDraft(data: FormValues) {
    validateFiles(); // non-blocking for draft
    setSaving(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      if (cronograma.fechaInicio && cronograma.fechaFin) {
        await saveCronograma(json.id);
      }
      router.push(`/solicitudes/${json.id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ── Submit: Guardar y Enviar ──────────────────────────────────────────────────
  async function onSendForm(data: FormValues) {
    if (!validateFiles()) return;
    setSending(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      const solicitudId: number = json.id;

      // Save cronograma if present
      if (cronograma.fechaInicio && cronograma.fechaFin) {
        await saveCronograma(solicitudId);
      }

      // Transition to ENVIADA
      const estadoRes = await fetch(`/api/solicitudes/${solicitudId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "ENVIAR" }),
      });
      if (!estadoRes.ok) {
        const d = await estadoRes.json();
        throw new Error(d.error ?? "Error al enviar la solicitud");
      }
      router.push(`/solicitudes/${solicitudId}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  }

  // ── Handle form submit (bound to handleSubmit) ────────────────────────────────
  // We differentiate by which button was pressed via separate handlers

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const today = formatDate(new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={15} />
          Volver
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-500">Nueva Solicitud</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">Contrato</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitud de Contrato</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Complete todos los campos para generar la solicitud de contrato.
        </p>
      </div>

      {/* ── HEADER (auto/read-only) ─────────────────────────────────────────── */}
      <Section title="Encabezado" badge="Automático">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Fecha de solicitud
            </p>
            <p className="text-sm text-gray-900 font-medium">{today}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Consecutivo
            </p>
            <p className="text-sm text-gray-400 italic">Se generará al enviar</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Solicitante
            </p>
            <p className="text-sm text-gray-900 font-medium">
              {session?.user?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500">{(session?.user as { cargo?: string })?.cargo ?? "—"}</p>
          </div>
        </div>
      </Section>

      {/* ── SECCIÓN 1: Información del Formulario ──────────────────────────── */}
      <Section title="Sección 1 — Información del Formulario">
        {/* 1.1 Frentes */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Frente(s) de Trabajo <span className="text-red-500">*</span>
          </label>
          {loadingFreentes ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Spinner size="sm" /> Cargando frentes…
            </div>
          ) : frentes.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              No hay frentes asignados a tu usuario.
            </div>
          ) : (
            <Controller
              name="frentesIds"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {frentes.map((frente) => {
                    const checked = field.value?.includes(frente.id) ?? false;
                    return (
                      <label
                        key={frente.id}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                          checked
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...(field.value ?? []), frente.id]
                              : (field.value ?? []).filter((id) => id !== frente.id);
                            field.onChange(next);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{frente.nombre}</p>
                          <p className="text-xs text-gray-500">{frente.proyecto.nombre}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          )}
          {errors.frentesIds && (
            <p className="text-xs text-red-500 mt-1">{errors.frentesIds.message}</p>
          )}
        </div>

        {/* 1.2 Tercero */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Nombre del Tercero (Contratista) <span className="text-red-500">*</span>
          </label>
          {loadingTerceros ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Spinner size="sm" /> Cargando contratistas…
            </div>
          ) : terceros.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              El contratista no ha completado la debida diligencia.{" "}
              <a href="/terceros" className="underline font-medium">
                Ir al módulo de Terceros.
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="search"
                value={terceroSearch}
                onChange={(e) => setTerceroSearch(e.target.value)}
                placeholder="Buscar por razón social o NIT…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Controller
                name="terceroId"
                control={control}
                render={({ field }) => (
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
                    {filteredTerceros.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-3">Sin resultados</p>
                    )}
                    {filteredTerceros.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2.5 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                          field.value === t.id
                            ? "bg-blue-50 border border-blue-300"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <input
                          type="radio"
                          name="terceroId"
                          checked={field.value === t.id}
                          onChange={() => field.onChange(t.id)}
                          className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">
                          <span className="font-medium">{t.razonSocial}</span>
                          <span className="text-gray-500 ml-1.5">— NIT {t.nit}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          )}
          {errors.terceroId && (
            <p className="text-xs text-red-500 mt-1">{errors.terceroId.message}</p>
          )}
        </div>

        {/* 1.3 Tipo de Contrato */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Tipo de Contrato <span className="text-red-500">*</span>
          </label>
          <Controller
            name="tipoContrato"
            control={control}
            render={({ field }) => (
              <div className="flex gap-4">
                {(
                  [
                    { value: "OBRA", label: "Obra" },
                    { value: "DISENO", label: "Diseño" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${
                      field.value === opt.value
                        ? "border-blue-400 bg-blue-50 text-blue-800"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={field.value === opt.value}
                      onChange={() => field.onChange(opt.value)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          />
          {watchTipoContrato === "DISENO" && (
            <div className="mt-2 flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Info size={13} className="mt-0.5 shrink-0" />
              Los contratos de diseño requieren adjuntar el archivo BEP en la sección de documentos.
            </div>
          )}
          {errors.tipoContrato && (
            <p className="text-xs text-red-500 mt-1">{errors.tipoContrato.message}</p>
          )}
        </div>

        {/* 1.4 Descripción */}
        <Textarea
          label="Descripción de la Actividad"
          required
          placeholder="Describa en detalle las actividades a contratar (mínimo 50 caracteres)…"
          showCount
          rows={4}
          {...register("descripcionActividad")}
          error={errors.descripcionActividad?.message}
        />

        {/* 1.5 Plazo */}
        <Input
          label="Plazo de Ejecución"
          required
          placeholder="Ej: 25 días calendario a partir del anticipo"
          {...register("plazoEjecucion")}
          error={errors.plazoEjecucion?.message}
        />

        {/* 1.6 Forma de Pago */}
        <Textarea
          label="Forma de Pago"
          required
          placeholder="Ej: 50% anticipo al inicio, 50% a la entrega final"
          rows={3}
          {...register("formaPago")}
          error={errors.formaPago?.message}
        />
      </Section>

      {/* ── SECCIÓN 2: Documentos ────────────────────────────────────────────── */}
      <Section title="Sección 2 — Documentos a Anexar">
        <FileField
          label="Cuadro Comparativo"
          required
          accept=".xlsx,.xls"
          value={archivoCuadroComparativo}
          onChange={setArchivoCuadroComparativo}
          error={fileErrors.cuadroComparativo}
        />
        <FileField
          label="Cotización"
          required
          accept=".pdf"
          value={archivoCotizacion}
          onChange={setArchivoCotizacion}
          error={fileErrors.cotizacion}
        />
        {watchTipoContrato === "DISENO" && (
          <FileField
            label="BEP (Bases de Especificaciones del Proyecto)"
            required
            accept=".pdf"
            value={archivoBEP}
            onChange={setArchivoBEP}
            error={fileErrors.bep}
          />
        )}
      </Section>

      {/* ── SECCIÓN 3: Valor Final ─────────────────────────────────────────── */}
      <Section title="Sección 3 — Valor Final">
        <div className="space-y-3">
          <Controller
            name="valorFinal"
            control={control}
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Valor del Contrato (COP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500 font-medium pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : Number(e.target.value);
                      field.onChange(val);
                    }}
                    className={`block w-full rounded-md border pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.valorFinal
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  />
                </div>
                {field.value && field.value > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {formatCurrency(field.value)}
                  </p>
                )}
                {errors.valorFinal && (
                  <p className="text-xs text-red-500 mt-1">{errors.valorFinal.message}</p>
                )}
              </div>
            )}
          />
          {valorEnLetras && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Valor en letras
              </p>
              <p className="text-sm text-gray-800 font-medium">{valorEnLetras}</p>
            </div>
          )}
        </div>
      </Section>

      {/* ── SECCIÓN 4: Asunto ─────────────────────────────────────────────── */}
      <Section title="Sección 4 — Asunto">
        <Textarea
          label="Asunto (auto-generado, editable)"
          required
          rows={2}
          {...register("asunto")}
          error={errors.asunto?.message}
        />
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Info size={11} />
          Se actualiza automáticamente al cambiar el frente, contratista o descripción.
        </p>
      </Section>

      {/* ── SECCIÓN 5: Formato de Solicitud de Contrato ───────────────────── */}
      <Section title="Sección 5 — Formato de Solicitud de Contrato" collapsible badge="*">
        <div className="space-y-4">
          {/* Auto-filled fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Área / Frente</p>
              <p className="text-sm text-gray-800">
                {frentes
                  .filter((f) => watchFrentesIds?.includes(f.id))
                  .map((f) => f.nombre)
                  .join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Solicitante</p>
              <p className="text-sm text-gray-800">{session?.user?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">{(session?.user as { cargo?: string })?.cargo ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Proyecto</p>
              <p className="text-sm text-gray-800">Baia Kristal</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo Contrato</p>
              <p className="text-sm text-gray-800">
                {watchTipoContrato === "OBRA" ? "Obra" : watchTipoContrato === "DISENO" ? "Diseño" : "—"}
              </p>
            </div>
          </div>

          {/* Creación de tercero */}
          <Controller
            name="creacionTercero"
            control={control}
            render={({ field }) => (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  ¿Requiere creación de tercero?
                </p>
                <div className="flex gap-4">
                  {[
                    { val: true, label: "Sí" },
                    { val: false, label: "No" },
                  ].map((opt) => (
                    <label
                      key={String(opt.val)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer text-sm transition-colors ${
                        field.value === opt.val
                          ? "border-blue-400 bg-blue-50 text-blue-800"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={field.value === opt.val}
                        onChange={() => field.onChange(opt.val)}
                        className="h-4 w-4 border-gray-300 text-blue-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          />

          {/* Contratante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contratante — Nombre"
              {...register("contratanteNombre")}
              error={errors.contratanteNombre?.message}
            />
            <Input
              label="Contratante — NIT"
              {...register("contratanteNit")}
              error={errors.contratanteNit?.message}
            />
          </div>

          {/* Contratista (auto from tercero) */}
          {selectedTercero && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Datos del Contratista</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Razón Social", selectedTercero.razonSocial],
                  ["NIT", selectedTercero.nit],
                  ["Representante Legal", selectedTercero.representanteLegal],
                  ["Cédula Representante", selectedTercero.cedulaRepresentante],
                  ["Correo de Firma", selectedTercero.correoFirma],
                  ["Dirección Representante", selectedTercero.direccionRepresentante],
                  ["Teléfono Representante", selectedTercero.telefonoRepresentante],
                  ...(selectedTercero.nombreContacto
                    ? [["Nombre Contacto", selectedTercero.nombreContacto]]
                    : []),
                  ...(selectedTercero.telefonoContacto
                    ? [["Teléfono Contacto", selectedTercero.telefonoContacto]]
                    : []),
                  ...(selectedTercero.correoContacto
                    ? [["Correo Contacto", selectedTercero.correoContacto]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-xs text-gray-500">{k}: </span>
                    <span className="text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentos checklist */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Documentos Obligatorios
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              {DOC_ITEMS.map((item) => (
                <Controller
                  key={item.key}
                  name={item.key}
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className="shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors"
                      >
                        {field.value ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                      <span className={field.value ? "text-gray-800" : ""}>{item.label}</span>
                    </label>
                  )}
                />
              ))}
            </div>
          </div>

          {/* Objeto (auto from descripcionActividad) */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Objeto</p>
            <p className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-[3rem]">
              {watchDescripcion || <span className="text-gray-400 italic">Se completará con la descripción de actividad.</span>}
            </p>
          </div>

          {/* Alcance */}
          <Textarea
            label="Alcance"
            placeholder="Describa el alcance del contrato…"
            rows={3}
            {...register("alcance")}
            error={errors.alcance?.message}
          />

          {/* Valor a contratar */}
          {watchValorFinal && watchValorFinal > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor a Contratar</p>
              <p className="text-sm text-gray-800 font-semibold">{formatCurrency(watchValorFinal)}</p>
              {valorEnLetras && (
                <p className="text-xs text-gray-500 mt-0.5">{valorEnLetras}</p>
              )}
            </div>
          )}

          {/* Condiciones Especiales */}
          <Textarea
            label="Condiciones Especiales"
            placeholder="Indique condiciones especiales del contrato…"
            rows={3}
            {...register("condicionesEspeciales")}
            error={errors.condicionesEspeciales?.message}
          />
        </div>
      </Section>

      {/* ── SECCIÓN 6: Cronograma ─────────────────────────────────────────── */}
      <Section title="Sección 6 — Cronograma" collapsible defaultOpen={false}>
        <CronogramaBuilder value={cronograma} onChange={setCronograma} />
      </Section>

      {/* ── Global error ──────────────────────────────────────────────────── */}
      {submitError && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {submitError}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          loading={saving}
          disabled={sending}
          onClick={handleSubmit(onSaveDraft)}
        >
          <Save size={16} />
          Guardar Borrador
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={sending}
          disabled={saving}
          onClick={handleSubmit(onSendForm)}
        >
          <Send size={16} />
          Guardar y Enviar
        </Button>
      </div>
    </div>
  );
}
