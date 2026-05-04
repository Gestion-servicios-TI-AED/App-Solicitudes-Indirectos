import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const frentes = await prisma.frente.findMany({
      include: {
        proyecto: { select: { id: true, nombre: true, activo: true } },
        aprobadorConfig: { select: { id: true, aprobadorId: true, frenteId: true } },
        usuarios: {
          include: {
            user: { select: { id: true, nombre: true, rol: true, cargo: true } },
          },
        },
      },
      orderBy: [{ proyecto: { nombre: "asc" } }, { nombre: "asc" }],
    });

    return Response.json(frentes);
  } catch (error) {
    console.error("GET /api/frentes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionRoles: string[] = session?.user?.roles ?? (session?.user?.rol ? [session.user.rol] : []);
    if (!session?.user || !sessionRoles.includes("ADMIN")) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre, proyectoId } = await request.json();
    if (!nombre?.trim()) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    if (!proyectoId) {
      return Response.json({ error: "El proyecto es requerido" }, { status: 400 });
    }

    const proyecto = await prisma.proyecto.findUnique({ where: { id: Number(proyectoId) } });
    if (!proyecto) {
      return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const frente = await prisma.frente.create({
      data: { nombre: nombre.trim(), proyectoId: Number(proyectoId) },
      include: { proyecto: { select: { id: true, nombre: true, activo: true } } },
    });

    return Response.json(frente, { status: 201 });
  } catch (error) {
    console.error("POST /api/frentes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
