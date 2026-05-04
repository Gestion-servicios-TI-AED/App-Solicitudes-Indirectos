import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMinStartDate } from "@/lib/holidays";

interface ActividadInput {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable?: string;
}

interface FaseInput {
  numeroFase: number;
  nombreFase: string;
  fechaInicio: string;
  fechaFin: string;
  actividades?: ActividadInput[];
}

interface CronogramaBody {
  tieneFases: boolean;
  fechaInicio: string;
  fechaFin: string;
  fases?: FaseInput[];
  actividades?: ActividadInput[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return upsertCronograma(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return upsertCronograma(request, params);
}

async function upsertCronograma(
  request: Request,
  params: Promise<{ id: string }>
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

    // Only the solicitante or CONTRATOS/ADMIN can set/replace cronograma
    const userId = session.user.id;
    const userRol = session.user.rol;
    if (
      solicitud.solicitanteId !== userId &&
      userRol !== "CONTRATOS" &&
      userRol !== "ADMIN"
    ) {
      return Response.json(
        { error: "No tienes permiso para modificar el cronograma de esta solicitud" },
        { status: 403 }
      );
    }

    const body: CronogramaBody = await request.json();
    const { tieneFases, fechaInicio, fechaFin, fases, actividades } = body;

    if (!fechaInicio || !fechaFin) {
      return Response.json(
        { error: "fechaInicio y fechaFin son obligatorios" },
        { status: 400 }
      );
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return Response.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    if (fin <= inicio) {
      return Response.json(
        { error: "fechaFin debe ser posterior a fechaInicio" },
        { status: 400 }
      );
    }

    // Validate: fechaInicio must be >= 13 business days from now
    const minStart = getMinStartDate();
    // Normalize to start of day for comparison
    const minStartDay = new Date(minStart);
    minStartDay.setHours(0, 0, 0, 0);
    const inicioDay = new Date(inicio);
    inicioDay.setHours(0, 0, 0, 0);

    if (inicioDay < minStartDay) {
      return Response.json(
        {
          error: `La fecha de inicio debe ser al menos 13 días hábiles desde hoy (mínimo: ${minStart.toISOString().split("T")[0]})`,
        },
        { status: 400 }
      );
    }

    // Delete existing cronograma and recreate (cascade deletes fases and actividades)
    const cronograma = await prisma.$transaction(async (tx) => {
      // Delete existing if present
      const existing = await tx.cronogramaContrato.findUnique({
        where: { solicitudId: numId },
      });
      if (existing) {
        await tx.cronogramaContrato.delete({ where: { solicitudId: numId } });
      }

      // Create new cronograma
      const created = await tx.cronogramaContrato.create({
        data: {
          solicitudId: numId,
          tieneFases,
          fechaInicio: inicio,
          fechaFin: fin,
        },
      });

      if (tieneFases && fases && fases.length > 0) {
        // Create fases with nested actividades
        for (const fase of fases) {
          const faseCreated = await tx.faseCronograma.create({
            data: {
              cronogramaId: created.id,
              numeroFase: fase.numeroFase,
              nombreFase: fase.nombreFase,
              fechaInicio: new Date(fase.fechaInicio),
              fechaFin: new Date(fase.fechaFin),
            },
          });

          if (fase.actividades && fase.actividades.length > 0) {
            await tx.actividadCronograma.createMany({
              data: fase.actividades.map((act) => ({
                cronogramaId: created.id,
                faseId: faseCreated.id,
                descripcion: act.descripcion,
                fechaInicio: new Date(act.fechaInicio),
                fechaFin: new Date(act.fechaFin),
                responsable: act.responsable ?? null,
              })),
            });
          }
        }
      } else if (!tieneFases && actividades && actividades.length > 0) {
        // Create actividades directly on cronograma (no fases)
        await tx.actividadCronograma.createMany({
          data: actividades.map((act) => ({
            cronogramaId: created.id,
            faseId: null,
            descripcion: act.descripcion,
            fechaInicio: new Date(act.fechaInicio),
            fechaFin: new Date(act.fechaFin),
            responsable: act.responsable ?? null,
          })),
        });
      }

      // Return the full cronograma with relations
      return tx.cronogramaContrato.findUnique({
        where: { id: created.id },
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
      });
    });

    return Response.json(cronograma, { status: 201 });
  } catch (error) {
    console.error("POST/PUT /api/solicitudes/[id]/cronograma error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
