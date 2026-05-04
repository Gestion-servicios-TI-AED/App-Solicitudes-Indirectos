import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildConsecutivo } from "@/lib/utils";

const ROLES_VER_TODAS: string[] = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "ADMIN"];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const tipo = searchParams.get("tipo");
    const frenteId = searchParams.get("frenteId");
    const solicitanteId = searchParams.get("solicitanteId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const userId = session.user.id;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (solicitanteId) where.solicitanteId = solicitanteId;

    if (fechaDesde || fechaHasta) {
      where.fechaSolicitud = {};
      if (fechaDesde) where.fechaSolicitud.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaSolicitud.lte = new Date(fechaHasta);
    }

    // frenteId filter is applied in-memory below after fetching (frentesIds is stored as JSON string in SQLite)

    // SOLICITANTE and DIRECTOR_PROYECTO only see their own frentes' solicitudes
    if (!userRoles.some((r) => ROLES_VER_TODAS.includes(r))) {
      const userFrente = await prisma.frenteUsuario.findMany({
        where: { userId },
        select: { frenteId: true },
      });
      const userFrenteIds = userFrente.map((f: { frenteId: number }) => f.frenteId);

      if (userFrenteIds.length === 0) {
        // No frentes assigned — only see own solicitudes
        where.solicitanteId = userId;
      } else {
        // See all solicitudes in their frentes OR their own
        // frentesIds is a JSON string in SQLite — in-memory filter applied after fetch
        where.OR = [
          { solicitanteId: userId },
        ];
      }
    }

    let solicitudes = await prisma.solicitud.findMany({
      where,
      include: {
        solicitante: { select: { id: true, nombre: true, cargo: true, email: true } },
        tercero: { select: { id: true, razonSocial: true, nit: true } },
        aprobador: { select: { id: true, nombre: true, cargo: true } },
      },
      orderBy: { creadoEn: "desc" },
    });

    // In-memory frenteId filter (frentesIds is stored as JSON string in SQLite)
    if (frenteId) {
      const fId = parseInt(frenteId, 10);
      solicitudes = solicitudes.filter((s) => {
        const ids: number[] = JSON.parse(s.frentesIds || "[]");
        return ids.includes(fId);
      });
    }

    return Response.json(solicitudes);
  } catch (error) {
    console.error("GET /api/solicitudes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    if (!userRoles.includes("SOLICITANTE") && !userRoles.includes("DIRECTOR_PROYECTO")) {
      return Response.json(
        { error: "Solo SOLICITANTE y DIRECTOR_PROYECTO pueden crear solicitudes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      tipo,
      proyectoId,
      frentesIds,
      terceroId,
      descripcionActividad,
      plazoEjecucion,
      formaPago,
      valorFinal,
      tipoContrato,
      asunto,
      creacionTercero,
      alcance,
      condicionesEspeciales,
      valorEnLetras,
    } = body;

    if (!tipo || !proyectoId || !frentesIds || frentesIds.length === 0) {
      return Response.json(
        { error: "tipo, proyectoId y frentesIds son obligatorios" },
        { status: 400 }
      );
    }

    // Find aprobador: if the solicitante is themselves a DIRECTOR_PROYECTO they self-approve;
    // otherwise find the DIRECTOR_PROYECTO assigned to the first frente.
    let aprobadorId: string | null = null;
    if (userRoles.includes("DIRECTOR_PROYECTO")) {
      aprobadorId = session.user.id;
    } else {
      const firstFrenteId = frentesIds[0];
      const frenteUsers = await prisma.frenteUsuario.findMany({
        where: { frenteId: Number(firstFrenteId) },
        include: { user: { select: { id: true, roles: true, activo: true } } },
      });
      const aprobadorUser = frenteUsers.find((fu) => {
        try {
          const r: string[] = JSON.parse(fu.user.roles || "[]");
          return r.includes("DIRECTOR_PROYECTO") && fu.user.activo;
        } catch {
          return false;
        }
      });
      aprobadorId = aprobadorUser?.user.id ?? null;
    }

    const anio = new Date().getFullYear();

    // Transactional consecutive number generation
    const solicitud = await prisma.$transaction(async (tx) => {
      // Upsert counter for this tipo+anio
      const key = `${tipo}-${anio}`;
      const counter = await tx.contadorConsecutivo.upsert({
        where: { tipo: key },
        update: { ultimo: { increment: 1 } },
        create: { tipo: key, anio, ultimo: 1 },
      });

      const consecutivo = buildConsecutivo(tipo as string, anio, counter.ultimo);

      return tx.solicitud.create({
        data: {
          consecutivo,
          tipo,
          proyectoId,
          frentesIds: JSON.stringify(frentesIds || []),
          solicitanteId: session.user.id,
          aprobadorId: aprobadorId ?? null,
          estado: "BORRADOR",
          terceroId: terceroId ?? null,
          descripcionActividad: descripcionActividad ?? null,
          plazoEjecucion: plazoEjecucion ?? null,
          formaPago: formaPago ?? null,
          valorFinal: valorFinal ?? null,
          tipoContrato: tipoContrato ?? null,
          asunto: asunto ?? null,
          creacionTercero: creacionTercero ?? false,
          alcance: alcance ?? null,
          condicionesEspeciales: condicionesEspeciales ?? null,
          valorEnLetras: valorEnLetras ?? null,
        },
        include: {
          solicitante: { select: { id: true, nombre: true, cargo: true } },
          tercero: { select: { id: true, razonSocial: true, nit: true } },
          aprobador: { select: { id: true, nombre: true, cargo: true } },
        },
      });
    });

    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("POST /api/solicitudes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
