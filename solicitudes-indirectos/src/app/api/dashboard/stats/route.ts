import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLES_VER_TODAS = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "ADMIN"];

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRoles: string[] = session.user.roles ?? [session.user.rol];

    // ── Estados "activos" (non-terminal) ──────────────────────────────────────
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

    // ── Completadas este mes ───────────────────────────────────────────────────
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build base where clause based on role visibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let baseWhere: any = {};

    if (!userRoles.some((r) => ROLES_VER_TODAS.includes(r))) {
      const userFrente = await prisma.frenteUsuario.findMany({
        where: { userId },
        select: { frenteId: true },
      });
      const userFrenteIds = userFrente.map((f: { frenteId: number }) => f.frenteId);

      if (userFrenteIds.length === 0) {
        baseWhere = { solicitanteId: userId };
      } else {
        baseWhere = {
          OR: [
            { solicitanteId: userId },
          ],
        };
      }
    }
    // CONTRATOS, CONTROLES, DIRECTOR_CONTROLES, ADMIN see all — baseWhere stays {}

    // ── 1. Total activas ──────────────────────────────────────────────────────
    const totalActivas = await prisma.solicitud.count({
      where: {
        ...baseWhere,
        estado: { in: [...ESTADOS_ACTIVOS] },
      },
    });

    // ── 2. Pendientes de mi aprobación ────────────────────────────────────────
    let pendientesMiAprobacion = 0;

    if (userRoles.includes("ADMIN")) {
      // Admin sees all non-terminal
      pendientesMiAprobacion = await prisma.solicitud.count({
        where: {
          estado: { in: [...ESTADOS_ACTIVOS] },
        },
      });
    } else if (userRoles.includes("DIRECTOR_CONTROLES")) {
      pendientesMiAprobacion = await prisma.solicitud.count({
        where: { estado: "APROBACION_FINAL" },
      });
    } else if (userRoles.includes("CONTROLES")) {
      pendientesMiAprobacion = await prisma.solicitud.count({
        where: { estado: "EN_CONTROLES" },
      });
    } else if (userRoles.includes("CONTRATOS")) {
      pendientesMiAprobacion = await prisma.solicitud.count({
        where: {
          estado: { in: ["APROBADA_DIRECTOR", "EN_TRAMITE_CONTRATOS"] },
        },
      });
    } else if (userRoles.includes("DIRECTOR_PROYECTO")) {
      // Director sees ENVIADA solicitudes assigned to them
      pendientesMiAprobacion = await prisma.solicitud.count({
        where: {
          aprobadorId: userId,
          estado: "ENVIADA",
        },
      });
    }
    // SOLICITANTE has no approval role — stays 0

    // ── 3. En revisión ────────────────────────────────────────────────────────
    const enRevision = await prisma.solicitud.count({
      where: {
        ...baseWhere,
        estado: "EN_REVISION",
      },
    });

    // ── 4. Completadas este mes ───────────────────────────────────────────────
    const completadasEsteMes = await prisma.solicitud.count({
      where: {
        ...baseWhere,
        estado: "COMPLETADA",
        actualizadoEn: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    return Response.json({
      totalActivas,
      pendientesMiAprobacion,
      enRevision,
      completadasEsteMes,
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
