import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        cargo: true,
        telefono: true,
        rol: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
        frentesAsignados: {
          include: {
            frente: {
              include: { proyecto: { select: { id: true, nombre: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return Response.json(user);
  } catch (error) {
    console.error("GET /api/users/me error:", error);
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
    const { nombre, cargo, telefono, currentPassword, newPassword } = body as {
      nombre?: string;
      cargo?: string;
      telefono?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (nombre !== undefined) updateData.nombre = nombre;
    if (cargo !== undefined) updateData.cargo = cargo || null;
    if (telefono !== undefined) updateData.telefono = telefono || null;

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return Response.json(
          { error: "Debes proporcionar la contraseña actual para cambiarla" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      if (!user.password) {
        return Response.json({ error: "Sin contraseña configurada" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return Response.json(
          { error: "La contraseña actual es incorrecta" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return Response.json(
          { error: "La nueva contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: "No se proporcionaron campos para actualizar" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        cargo: true,
        telefono: true,
        rol: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
