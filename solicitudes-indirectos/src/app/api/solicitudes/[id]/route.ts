import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
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

    const solicitud = await prisma.solicitud.findUnique({
      where: { id: numId },
      include: {
        solicitante: {
          select: { id: true, nombre: true, cargo: true, email: true, telefono: true },
        },
        tercero: true,
        aprobador: {
          select: { id: true, nombre: true, cargo: true, email: true },
        },
        cronograma: {
          include: {
            fases: {
              include: { actividades: { orderBy: { id: "asc" } } },
              orderBy: { numeroFase: "asc" },
            },
            actividades: {
              where: { faseId: null },
              orderBy: { fechaInicio: "asc" },
            },
          },
        },
        historial: {
          include: {
            usuario: { select: { id: true, nombre: true, rol: true } },
          },
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!solicitud) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Access control: SOLICITANTE/DIRECTOR_PROYECTO can only see solicitudes from their frentes or their own
    const userRol = session.user.rol;
    const userId = session.user.id;

    if (userRol === "SOLICITANTE" || userRol === "DIRECTOR_PROYECTO") {
      if (solicitud.solicitanteId !== userId) {
        const userFrente = await prisma.frenteUsuario.findMany({
          where: { userId },
          select: { frenteId: true },
        });
        const userFrenteIds = userFrente.map((f: { frenteId: number }) => f.frenteId);
        const frentesArr: number[] = JSON.parse(solicitud.frentesIds || "[]");
        const hasAccess = frentesArr.some((fId: number) => userFrenteIds.includes(fId));
        if (!hasAccess) {
          return Response.json({ error: "Sin acceso a esta solicitud" }, { status: 403 });
        }
      }
    }

    return Response.json({
      ...solicitud,
      frentesIdsArray: JSON.parse(solicitud.frentesIds || "[]"),
    });
  } catch (error) {
    console.error("GET /api/solicitudes/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
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

    const solicitud = await prisma.solicitud.findUnique({ where: { id: numId } });
    if (!solicitud) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Only BORRADOR or DEVUELTA solicitudes can be freely edited
    const userId = session.user.id;
    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const isAdmin = userRoles.includes("ADMIN");
    const isContratos = userRoles.includes("CONTRATOS");

    const isOwner = solicitud.solicitanteId === userId;
    const isEditableState =
      solicitud.estado === "BORRADOR" || solicitud.estado === "DEVUELTA" || solicitud.estado === "EN_REVISION";

    if (!isEditableState && !isAdmin && !isContratos) {
      return Response.json(
        { error: "Solo se pueden editar solicitudes en estado BORRADOR, DEVUELTA o EN_REVISION" },
        { status: 409 }
      );
    }

    if (
      (solicitud.estado === "BORRADOR" || solicitud.estado === "DEVUELTA") &&
      !isOwner &&
      !isAdmin
    ) {
      return Response.json(
        { error: "Solo el solicitante puede editar esta solicitud" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Strip fields that should not be directly editable via PATCH
    const {
      consecutivo: _consecutivo,
      solicitanteId: _solicitanteId,
      estado: _estado,
      historial: _historial,
      cronograma: _cronograma,
      ...updateData
    } = body;

    // Serialize frentesIds to JSON string if provided as array
    if (Array.isArray(updateData.frentesIds)) {
      updateData.frentesIds = JSON.stringify(updateData.frentesIds);
    }

    const updated = await prisma.solicitud.update({
      where: { id: numId },
      data: updateData,
      include: {
        solicitante: { select: { id: true, nombre: true, cargo: true } },
        tercero: { select: { id: true, razonSocial: true, nit: true } },
        aprobador: { select: { id: true, nombre: true, cargo: true } },
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/solicitudes/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
