"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  RotateCcw,
  ClipboardCheck,
  Hash,
  ThumbsUp,
  ChevronRight,
  Upload,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { Spinner } from "@/components/ui/spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Anexo {
  url: string;
  nombre: string;
}

interface SolicitudActionsProps {
  solicitud: {
    id: number;
    estado: string;
    solicitanteId: string;
    aprobadorId?: string | null;
    consecutivo: string;
    archivosAnexos?: string | null;
  };
  userSession: {
    user: {
      id: string;
      rol: string;
      roles?: string[];
    };
  } | null;
}

type AccionEstado =
  | "ENVIAR"
  | "APROBAR_DIRECTOR"
  | "DEVOLVER"
  | "REVISAR"
  | "TRAMITAR_OK"
  | "AVANZAR_CONTRATOS"
  | "REGISTRAR_ADPRO"
  | "APROBAR_FINAL"
  | "REENVIAR";

// ─── Component ────────────────────────────────────────────────────────────────

export function SolicitudActions({ solicitud, userSession }: SolicitudActionsProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [anexos, setAnexos] = useState<Anexo[]>(() => {
    try { return JSON.parse(solicitud.archivosAnexos || "[]"); } catch { return []; }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    | "enviar"
    | "aprobar"
    | "devolver"
    | "contratos"
    | "adpro"
    | "aprobar_final"
    | "reenviar"
    | null
  >(null);
  const [nota, setNota] = useState("");
  const [contratosOpcion, setContratosOpcion] = useState<"OK" | "REVISAR">("OK");
  const [notaContratos, setNotaContratos] = useState("");
  const [adproNum, setAdproNum] = useState("");

  const { estado, solicitanteId, aprobadorId } = solicitud;
  const userId = userSession?.user?.id;
  const rol = userSession?.user?.rol;
  const userRoles: string[] = userSession?.user?.roles ?? (rol ? [rol] : []);

  // ── Visibility rules ────────────────────────────────────────────────────────

  const canEnviar =
    estado === "BORRADOR" &&
    (userRoles.includes("SOLICITANTE") || userRoles.includes("DIRECTOR_PROYECTO")) &&
    solicitanteId === userId;

  const canAprobarDirector =
    estado === "ENVIADA" &&
    userRoles.includes("DIRECTOR_PROYECTO") &&
    (!aprobadorId || aprobadorId === userId);

  const canDevolver =
    estado === "ENVIADA" &&
    userRoles.includes("DIRECTOR_PROYECTO") &&
    (!aprobadorId || aprobadorId === userId);

  const canContratosAction =
    (estado === "APROBADA_DIRECTOR" || estado === "EN_TRAMITE_CONTRATOS") &&
    userRoles.includes("CONTRATOS");

  const showAnexosUpload =
    estado === "CREACION_MINUTA" && userRoles.includes("CONTRATOS");

  const canAvanzarContratos =
    estado === "CREACION_MINUTA" && userRoles.includes("CONTRATOS") && anexos.length > 0;

  const canRegistrarAdpro =
    estado === "EN_CONTROLES" && userRoles.includes("CONTROLES");

  const canAprobarFinal =
    estado === "APROBACION_FINAL" && userRoles.includes("DIRECTOR_CONTROLES");

  const canReenviar =
    (estado === "DEVUELTA" || estado === "EN_REVISION") &&
    (userRoles.includes("SOLICITANTE") || userRoles.includes("DIRECTOR_PROYECTO")) &&
    solicitanteId === userId;

  const hasAnyAction =
    canEnviar ||
    canAprobarDirector ||
    canDevolver ||
    canContratosAction ||
    showAnexosUpload ||
    canAvanzarContratos ||
    canRegistrarAdpro ||
    canAprobarFinal ||
    canReenviar;

  if (!hasAnyAction) return null;

  // ── API call ────────────────────────────────────────────────────────────────

  async function executeAction(
    accion: AccionEstado,
    extra: Record<string, string> = {}
  ) {
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, ...extra }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error ?? "Error al ejecutar la acción", "error");
        return;
      }

      addToast("Acción ejecutada correctamente", "success");
      setModalOpen(false);
      setNota("");
      setNotaContratos("");
      setAdproNum("");
      router.refresh();
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Anexos upload ────────────────────────────────────────────────────────────

  async function handleAnexoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingAnexo(true);
    try {
      const newAnexos: Anexo[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const d = await uploadRes.json();
          throw new Error(d.error ?? "Error al subir archivo");
        }
        const { url, nombre } = await uploadRes.json();
        newAnexos.push({ url, nombre: nombre ?? file.name });
      }

      const updatedAnexos = [...anexos, ...newAnexos];
      const patchRes = await fetch(`/api/solicitudes/${solicitud.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivosAnexos: JSON.stringify(updatedAnexos) }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json();
        throw new Error(d.error ?? "Error al guardar los archivos");
      }
      setAnexos(updatedAnexos);
      addToast(`${newAnexos.length === 1 ? "Archivo adjuntado" : `${newAnexos.length} archivos adjuntados`} correctamente`, "success");
      router.refresh();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al subir archivo", "error");
    } finally {
      setUploadingAnexo(false);
      e.target.value = "";
    }
  }

  async function removeAnexo(idx: number) {
    const updated = anexos.filter((_, i) => i !== idx);
    const patchRes = await fetch(`/api/solicitudes/${solicitud.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivosAnexos: JSON.stringify(updated) }),
    });
    if (patchRes.ok) {
      setAnexos(updated);
      router.refresh();
    }
  }

  // ── Modal handlers ──────────────────────────────────────────────────────────

  function openModal(type: typeof modalType) {
    setModalType(type);
    setNota("");
    setContratosOpcion("OK");
    setNotaContratos("");
    setAdproNum("");
    setModalOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setModalOpen(false);
    setModalType(null);
  }

  async function handleModalConfirm() {
    if (modalType === "enviar") {
      await executeAction("ENVIAR");
    } else if (modalType === "aprobar") {
      await executeAction("APROBAR_DIRECTOR");
    } else if (modalType === "devolver") {
      if (!nota.trim()) {
        addToast("La nota es obligatoria para devolver", "error");
        return;
      }
      await executeAction("DEVOLVER", { nota });
    } else if (modalType === "contratos") {
      if (contratosOpcion === "OK") {
        await executeAction("TRAMITAR_OK", notaContratos ? { nota: notaContratos } : {});
      } else {
        if (!notaContratos.trim()) {
          addToast("La nota es obligatoria cuando se requiere revisión", "error");
          return;
        }
        await executeAction("REVISAR", { nota: notaContratos });
      }
    } else if (modalType === "adpro") {
      if (!adproNum.trim()) {
        addToast("El número de contrato Adpro es obligatorio", "error");
        return;
      }
      await executeAction("REGISTRAR_ADPRO", { numeroContratoAdpro: adproNum });
    } else if (modalType === "aprobar_final") {
      await executeAction("APROBAR_FINAL");
    } else if (modalType === "reenviar") {
      await executeAction("REENVIAR");
    }
  }

  // ── Modal content ───────────────────────────────────────────────────────────

  function getModalTitle() {
    switch (modalType) {
      case "enviar":      return "Confirmar envío de solicitud";
      case "aprobar":     return "Aprobar solicitud";
      case "devolver":    return "Devolver solicitud";
      case "contratos":   return "Revisión de Contratos";
      case "adpro":       return "Registrar Número Adpro";
      case "aprobar_final": return "Aprobación definitiva";
      case "reenviar":    return "Reenviar solicitud";
      default:            return "";
    }
  }

  return (
    <>
      {/* Anexos upload — CREACION_MINUTA / CONTRATOS */}
      {showAnexosUpload && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Anexos de la solicitud
            <span className="ml-1.5 text-xs font-normal text-red-500">* al menos 1 requerido</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Adjunte los documentos necesarios antes de continuar al paso siguiente. Puede adjuntar varios archivos.
          </p>

          {/* Uploaded files list */}
          {anexos.length > 0 && (
            <ul className="mb-3 space-y-2">
              {anexos.map((a, idx) => (
                <li key={idx} className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <FileCheck size={15} className="text-green-600 shrink-0" />
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 text-xs font-medium text-green-800 hover:underline truncate"
                  >
                    {a.nombre}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAnexo(idx)}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0 px-1"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Upload zone */}
          <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 cursor-pointer transition-colors ${uploadingAnexo ? "border-blue-200 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}>
            {uploadingAnexo ? (
              <Spinner size="sm" />
            ) : (
              <Upload size={20} className="text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-600">
              {uploadingAnexo ? "Subiendo…" : anexos.length > 0 ? "Agregar más documentos" : "Seleccionar documentos"}
            </span>
            <span className="text-xs text-gray-400">Cualquier tipo de archivo — máx. 20MB c/u</span>
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={handleAnexoUpload}
              disabled={uploadingAnexo}
            />
          </label>
        </div>
      )}

      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Acciones disponibles</h3>
        <div className="flex flex-wrap gap-3">

          {canEnviar && (
            <Button
              onClick={() => openModal("enviar")}
              disabled={loading}
            >
              <Send size={15} />
              Enviar Solicitud
            </Button>
          )}

          {canAprobarDirector && (
            <Button
              variant="primary"
              onClick={() => openModal("aprobar")}
              disabled={loading}
            >
              <CheckCircle size={15} />
              Aprobar
            </Button>
          )}

          {canDevolver && (
            <Button
              variant="danger"
              onClick={() => openModal("devolver")}
              disabled={loading}
            >
              <RotateCcw size={15} />
              Devolver
            </Button>
          )}

          {canContratosAction && (
            <Button
              variant="primary"
              onClick={() => openModal("contratos")}
              disabled={loading}
            >
              <ClipboardCheck size={15} />
              Revisar documentación
            </Button>
          )}

          {showAnexosUpload && (
            <div title={anexos.length === 0 ? "Adjunte al menos un documento primero" : undefined}>
              <Button
                variant="primary"
                onClick={() => executeAction("AVANZAR_CONTRATOS")}
                loading={loading}
                disabled={anexos.length === 0}
              >
                <ChevronRight size={15} />
                Pasar a Controles
              </Button>
            </div>
          )}

          {canRegistrarAdpro && (
            <Button
              variant="primary"
              onClick={() => openModal("adpro")}
              disabled={loading}
            >
              <Hash size={15} />
              Registrar Número Adpro
            </Button>
          )}

          {canAprobarFinal && (
            <Button
              variant="primary"
              onClick={() => openModal("aprobar_final")}
              disabled={loading}
            >
              <ThumbsUp size={15} />
              Aprobar Definitivamente
            </Button>
          )}

          {canReenviar && (
            <Button
              variant="primary"
              onClick={() => openModal("reenviar")}
              disabled={loading}
            >
              <Send size={15} />
              Reenviar
            </Button>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={getModalTitle()}
        size="md"
      >
        <div className="space-y-4">
          {/* Enviar */}
          {modalType === "enviar" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas que deseas enviar la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong> para aprobación del director?
            </p>
          )}

          {/* Aprobar director */}
          {modalType === "aprobar" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas la aprobación de la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong>? Pasará a Contratos para su trámite.
            </p>
          )}

          {/* Devolver */}
          {modalType === "devolver" && (
            <>
              <p className="text-sm text-gray-600">
                Indica el motivo por el que devuelves esta solicitud. El solicitante
                recibirá esta nota.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={4}
                  placeholder="Escribe el motivo de la devolución..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Contratos */}
          {modalType === "contratos" && (
            <>
              <p className="text-sm text-gray-600">
                Selecciona el resultado de la revisión de la documentación:
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="contratosOpcion"
                    value="OK"
                    checked={contratosOpcion === "OK"}
                    onChange={() => setContratosOpcion("OK")}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      OK — Documentación Completa
                    </p>
                    <p className="text-xs text-gray-500">
                      La documentación está completa y se puede proceder a crear la minuta.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="contratosOpcion"
                    value="REVISAR"
                    checked={contratosOpcion === "REVISAR"}
                    onChange={() => setContratosOpcion("REVISAR")}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Se Debe Revisar
                    </p>
                    <p className="text-xs text-gray-500">
                      Hay observaciones que el solicitante debe atender.
                    </p>
                  </div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota{contratosOpcion === "REVISAR" && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea
                  value={notaContratos}
                  onChange={(e) => setNotaContratos(e.target.value)}
                  rows={3}
                  placeholder={
                    contratosOpcion === "REVISAR"
                      ? "Describe qué debe revisarse..."
                      : "Observaciones opcionales..."
                  }
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Adpro */}
          {modalType === "adpro" && (
            <>
              <p className="text-sm text-gray-600">
                Ingresa el número de contrato Adpro asignado a esta solicitud.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número Adpro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adproNum}
                  onChange={(e) => setAdproNum(e.target.value)}
                  placeholder="Ej. ADPRO-2024-001"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Aprobar final */}
          {modalType === "aprobar_final" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas la aprobación definitiva de la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong>? El estado cambiará a{" "}
              <strong>Completada</strong>.
            </p>
          )}

          {/* Reenviar */}
          {modalType === "reenviar" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas que deseas reenviar la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong> para su aprobación?
            </p>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant={modalType === "devolver" ? "danger" : "primary"}
              onClick={handleModalConfirm}
              loading={loading}
            >
              {modalType === "enviar"       && "Enviar"}
              {modalType === "aprobar"      && "Aprobar"}
              {modalType === "devolver"     && "Devolver"}
              {modalType === "contratos"    && (contratosOpcion === "OK" ? "Confirmar OK" : "Enviar a Revisión")}
              {modalType === "adpro"        && "Registrar"}
              {modalType === "aprobar_final" && "Aprobar Definitivamente"}
              {modalType === "reenviar"     && "Reenviar"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
