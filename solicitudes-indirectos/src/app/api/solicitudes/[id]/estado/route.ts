import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  notificarNuevaSolicitud,
  notificarAprobadaDirector,
  notificarDevuelta,
  notificarEnRevision,
  notificarControles,
  notificarAdproRegistrado,
  notificarCompletada,
} from "@/lib/notifications";
type AccionEstado =
  | "ENVIAR"
  | "APROBAR_DIRECTOR"
  | "DEVOLVER"
  | "REVISAR"
  | "TRAMITAR_OK"
  | "AVANZAR_CONTRATOS"
  | "PASAR_CONTROLES"
  | "REGISTRAR_ADPRO"
  | "APROBAR_FINAL"
  | "REENVIAR";

interface TransicionConfig {
  estadosOrigen: string[];
  rolesPermitidos: string[];
}

const TRANSICIONES: Record<AccionEstado, TransicionConfig> = {
  ENVIAR: {
    estadosOrigen: ["BORRADOR"],
    rolesPermitidos: ["SOLICITANTE", "DIRECTOR_PROYECTO"],
  },
  APROBAR_DIRECTOR: {
    estadosOrigen: ["ENVIADA"],
    rolesPermitidos: ["DIRECTOR_PROYECTO"],
  },
  DEVOLVER: {
    estadosOrigen: ["ENVIADA", "EN_TRAMITE_CONTRATOS"],
    rolesPermitidos: ["DIRECTOR_PROYECTO", "CONTRATOS"],
  },
  REVISAR: {
    estadosOrigen: ["APROBADA_DIRECTOR", "EN_TRAMITE_CONTRATOS"],
    rolesPermitidos: ["CONTRATOS"],
  },
  TRAMITAR_OK: {
    estadosOrigen: ["EN_TRAMITE_CONTRATOS", "APROBADA_DIRECTOR"],
    rolesPermitidos: ["CONTRATOS"],
  },
  AVANZAR_CONTRATOS: {
    estadosOrigen: ["CREACION_MINUTA"],
    rolesPermitidos: ["CONTRATOS"],
  },
  PASAR_CONTROLES: {
    estadosOrigen: ["ENVIO_CONTRATO_POLIZAS"],
    rolesPermitidos: ["CONTRATOS"],
  },
  REGISTRAR_ADPRO: {
    estadosOrigen: ["EN_CONTROLES"],
    rolesPermitidos: ["CONTROLES"],
  },
  APROBAR_FINAL: {
    estadosOrigen: ["APROBACION_FINAL"],
    rolesPermitidos: ["DIRECTOR_CONTROLES"],
  },
  REENVIAR: {
    estadosOrigen: ["DEVUELTA", "EN_REVISION"],
    rolesPermitidos: ["SOLICITANTE", "DIRECTOR_PROYECTO"],
  },
};

const ESTADO_DESTINO: Record<AccionEstado, string> = {
  ENVIAR: "ENVIADA",
  APROBAR_DIRECTOR: "EN_TRAMITE_CONTRATOS",
  DEVOLVER: "DEVUELTA",
  REVISAR: "EN_REVISION",
  TRAMITAR_OK: "CREACION_MINUTA",
  AVANZAR_CONTRATOS: "EN_CONTROLES",
  PASAR_CONTROLES: "EN_CONTROLES",
  REGISTRAR_ADPRO: "APROBACION_FINAL",
  APROBAR_FINAL: "COMPLETADA",
  REENVIAR: "ENVIADA",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const {
      accion,
      nota,
      estadoContratacion,
      numeroContratoAdpro,
    }: {
      accion: AccionEstado;
      nota?: string;
      estadoContratacion?: string;
      numeroContratoAdpro?: string;
    } = body;

    if (!accion) {
      return Response.json({ error: "accion es requerida" }, { status: 400 });
    }

    const transicion = TRANSICIONES[accion];
    if (!transicion) {
      return Response.json({ error: `Acción desconocida: ${accion}` }, { status: 400 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const userId = session.user.id;

    // Validate role permission
    if (!transicion.rolesPermitidos.some((r) => userRoles.includes(r))) {
      return Response.json(
        { error: `No tienes permiso para ejecutar la acción ${accion}` },
        { status: 403 }
      );
    }

    // Load solicitud with relations
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: numId },
      include: {
        solicitante: { select: { id: true, nombre: true } },
        aprobador: { select: { id: true, nombre: true } },
      },
    });

    if (!solicitud) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Validate current state
    if (!transicion.estadosOrigen.includes(solicitud.estado)) {
      return Response.json(
        {
          error: `La solicitud está en estado ${solicitud.estado} y no puede ejecutar ${accion}`,
        },
        { status: 409 }
      );
    }

    // ── Per-action validations ─────────────────────────────────────────────────

    if (accion === "ENVIAR") {
      const requiredFields = [
        "tipo",
        "terceroId",
        "descripcionActividad",
        "plazoEjecucion",
        "formaPago",
        "valorFinal",
        "tipoContrato",
      ] as const;
      for (const field of requiredFields) {
        if (!solicitud[field]) {
          return Response.json(
            { error: `El campo ${field} es obligatorio para enviar` },
            { status: 400 }
          );
        }
      }
      const frentesArr: number[] = JSON.parse(solicitud.frentesIds || "[]");
      if (frentesArr.length === 0) {
        return Response.json(
          { error: "Debe seleccionar al menos un frente" },
          { status: 400 }
        );
      }
    }

    if (accion === "APROBAR_DIRECTOR") {
      // Must be the assigned aprobador
      if (solicitud.aprobadorId && solicitud.aprobadorId !== userId) {
        return Response.json(
          { error: "Solo el director aprobador asignado puede aprobar esta solicitud" },
          { status: 403 }
        );
      }
    }

    if (accion === "DEVOLVER" || accion === "REVISAR") {
      if (!nota || nota.trim() === "") {
        return Response.json(
          { error: "Se requiere una nota para esta acción" },
          { status: 400 }
        );
      }
    }

    if (accion === "REENVIAR") {
      // Only the original solicitante
      if (solicitud.solicitanteId !== userId) {
        return Response.json(
          { error: "Solo el solicitante original puede reenviar la solicitud" },
          { status: 403 }
        );
      }
    }

    if (accion === "AVANZAR_CONTRATOS") {
      const anexos: unknown[] = (() => { try { return JSON.parse(solicitud.archivosAnexos || "[]"); } catch { return []; } })();
      if (anexos.length === 0) {
        return Response.json(
          { error: "Debe adjuntar al menos un documento en Anexos de la solicitud antes de continuar" },
          { status: 400 }
        );
      }
    }

    if (accion === "REGISTRAR_ADPRO") {
      if (!numeroContratoAdpro || numeroContratoAdpro.trim() === "") {
        return Response.json(
          { error: "Se requiere el número de contrato Adpro" },
          { status: 400 }
        );
      }
    }

    // ── Build update data ──────────────────────────────────────────────────────
    const estadoDestino = ESTADO_DESTINO[accion];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { estado: estadoDestino };

    if (accion === "APROBAR_DIRECTOR") {
      updateData.fechaAprobacionDirector = new Date();
    }

    if (accion === "REVISAR") {
      updateData.necesitaRevision = true;
      updateData.notaContratacion = nota;
    }

    if (accion === "DEVOLVER") {
      updateData.notaContratacion = nota;
    }

    if (accion === "REGISTRAR_ADPRO") {
      updateData.numeroContratoAdpro = numeroContratoAdpro;
    }

    if (estadoContratacion) {
      updateData.notaContratacion = estadoContratacion;
    }

    // ── Execute transition in transaction ──────────────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitud.update({
        where: { id: numId },
        data: updateData,
      });

      await tx.historialSolicitud.create({
        data: {
          solicitudId: numId,
          usuarioId: userId,
          accion,
          nota: nota ?? null,
        },
      });

      return sol;
    });

    // ── Send notifications (outside transaction) ───────────────────────────────
    try {
      if (accion === "ENVIAR" && solicitud.aprobadorId) {
        await notificarNuevaSolicitud(
          numId,
          solicitud.solicitante.nombre,
          solicitud.consecutivo,
          solicitud.aprobadorId
        );
      }

      if (accion === "APROBAR_DIRECTOR") {
        // Notify solicitante + all CONTRATOS users
        const allActiveUsers = await prisma.user.findMany({
          where: { activo: true },
          select: { id: true, roles: true },
        });
        const contratosUsers = allActiveUsers.filter((u) => {
          try { return (JSON.parse(u.roles || "[]") as string[]).includes("CONTRATOS"); } catch { return false; }
        });
        await Promise.all(
          contratosUsers.map((u: { id: string }) =>
            notificarAprobadaDirector(
              numId,
              solicitud.consecutivo,
              solicitud.solicitanteId,
              u.id
            )
          )
        );
      }

      if (accion === "DEVOLVER" && nota) {
        await notificarDevuelta(
          numId,
          solicitud.consecutivo,
          solicitud.solicitanteId,
          nota
        );
      }

      if (accion === "REVISAR" && nota) {
        await notificarEnRevision(
          numId,
          solicitud.consecutivo,
          solicitud.solicitanteId,
          nota
        );
      }

      if (accion === "AVANZAR_CONTRATOS" || accion === "PASAR_CONTROLES") {
        const allActiveUsers2 = await prisma.user.findMany({
          where: { activo: true },
          select: { id: true, roles: true },
        });
        const controlesUsers = allActiveUsers2.filter((u) => {
          try { return (JSON.parse(u.roles || "[]") as string[]).includes("CONTROLES"); } catch { return false; }
        });
        await Promise.all(
          controlesUsers.map((u: { id: string }) =>
            notificarControles(numId, solicitud.consecutivo, u.id)
          )
        );
      }

      if (accion === "REGISTRAR_ADPRO") {
        const allActiveUsers3 = await prisma.user.findMany({
          where: { activo: true },
          select: { id: true, roles: true },
        });
        const directorControlesUsers = allActiveUsers3.filter((u) => {
          try { return (JSON.parse(u.roles || "[]") as string[]).includes("DIRECTOR_CONTROLES"); } catch { return false; }
        });
        await Promise.all(
          directorControlesUsers.map((u: { id: string }) =>
            notificarAdproRegistrado(numId, solicitud.consecutivo, u.id)
          )
        );
      }

      if (accion === "APROBAR_FINAL") {
        const involucrados = [solicitud.solicitanteId];
        if (solicitud.aprobadorId) involucrados.push(solicitud.aprobadorId);
        await notificarCompletada(numId, solicitud.consecutivo, involucrados);
      }
    } catch (notifError) {
      // Notifications are non-critical; log but do not fail the request
      console.error("Error al enviar notificaciones:", notifError);
    }

    return Response.json(updated);
  } catch (error) {
    console.error("POST /api/solicitudes/[id]/estado error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
