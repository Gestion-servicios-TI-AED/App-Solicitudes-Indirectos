import { prisma } from "@/lib/prisma";

export async function crearNotificacion(
  userId: string,
  titulo: string,
  mensaje: string,
  url?: string
) {
  await prisma.notificacion.create({
    data: { userId, titulo, mensaje, url },
  });
}

export async function notificarNuevaSolicitud(
  solicitudId: number,
  solicitanteNombre: string,
  consecutivo: string,
  aprobadorId: string
) {
  await crearNotificacion(
    aprobadorId,
    "Nueva solicitud pendiente de aprobación",
    `${solicitanteNombre} envió la solicitud ${consecutivo} para su aprobación.`,
    `/solicitudes/${solicitudId}`
  );
}

export async function notificarAprobadaDirector(
  solicitudId: number,
  consecutivo: string,
  solicitanteId: string,
  contratosUserId: string
) {
  await Promise.all([
    crearNotificacion(
      solicitanteId,
      "Solicitud aprobada por Director",
      `Tu solicitud ${consecutivo} fue aprobada por el Director de Proyecto.`,
      `/solicitudes/${solicitudId}`
    ),
    crearNotificacion(
      contratosUserId,
      "Nueva solicitud en trámite",
      `La solicitud ${consecutivo} está lista para tramitar en contratación.`,
      `/solicitudes/${solicitudId}`
    ),
  ]);
}

export async function notificarDevuelta(
  solicitudId: number,
  consecutivo: string,
  solicitanteId: string,
  nota: string
) {
  await crearNotificacion(
    solicitanteId,
    "Solicitud devuelta para correcciones",
    `Tu solicitud ${consecutivo} fue devuelta. Nota: ${nota}`,
    `/solicitudes/${solicitudId}`
  );
}

export async function notificarEnRevision(
  solicitudId: number,
  consecutivo: string,
  solicitanteId: string,
  nota: string
) {
  await crearNotificacion(
    solicitanteId,
    "Solicitud requiere revisión",
    `Tu solicitud ${consecutivo} debe revisarse. Nota: ${nota}`,
    `/solicitudes/${solicitudId}`
  );
}

export async function notificarControles(
  solicitudId: number,
  consecutivo: string,
  controlesUserId: string
) {
  await crearNotificacion(
    controlesUserId,
    "Solicitud lista para registro en Adpro",
    `La solicitud ${consecutivo} completó el trámite de contratos y debe registrarse en Adpro.`,
    `/solicitudes/${solicitudId}`
  );
}

export async function notificarAdproRegistrado(
  solicitudId: number,
  consecutivo: string,
  directorControlesId: string
) {
  await crearNotificacion(
    directorControlesId,
    "Solicitud lista para aprobación final",
    `La solicitud ${consecutivo} tiene número Adpro registrado y requiere su aprobación final.`,
    `/solicitudes/${solicitudId}`
  );
}

export async function notificarCompletada(
  solicitudId: number,
  consecutivo: string,
  involucrados: string[]
) {
  await Promise.all(
    involucrados.map((userId) =>
      crearNotificacion(
        userId,
        "Solicitud completada",
        `La solicitud ${consecutivo} fue aprobada definitivamente y está completada.`,
        `/solicitudes/${solicitudId}`
      )
    )
  );
}
