import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;

    const notificaciones = await prisma.notificacion.findMany({
      where: { userId },
      orderBy: [{ leida: "asc" }, { creadoEn: "desc" }],
      take: 20,
    });

    const totalNoLeidas = await prisma.notificacion.count({
      where: { userId, leida: false },
    });

    return Response.json({ notificaciones, totalNoLeidas });
  } catch (error) {
    console.error("GET /api/notificaciones error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { all, id } = body as { all?: boolean; id?: number };

    if (all === true) {
      // Mark all notifications as read for this user
      await prisma.notificacion.updateMany({
        where: { userId, leida: false },
        data: { leida: true },
      });
      return Response.json({ message: "Todas las notificaciones marcadas como leídas" });
    }

    if (id !== undefined && id !== null) {
      const notif = await prisma.notificacion.findUnique({ where: { id } });
      if (!notif) {
        return Response.json({ error: "Notificación no encontrada" }, { status: 404 });
      }
      if (notif.userId !== userId) {
        return Response.json({ error: "Sin acceso a esta notificación" }, { status: 403 });
      }
      const updated = await prisma.notificacion.update({
        where: { id },
        data: { leida: true },
      });
      return Response.json(updated);
    }

    return Response.json(
      { error: "Se requiere { all: true } o { id: number }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("PATCH /api/notificaciones error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
