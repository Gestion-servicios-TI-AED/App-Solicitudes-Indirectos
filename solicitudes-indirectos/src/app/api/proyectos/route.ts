import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const proyectos = await prisma.proyecto.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { frentes: true } } },
  });

  return Response.json(proyectos);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.rol !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const { nombre } = await request.json();
  if (!nombre?.trim()) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.create({
    data: { nombre: nombre.trim() },
  });

  return Response.json(proyecto, { status: 201 });
}
