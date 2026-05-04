import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    if (!userRoles.includes("ADMIN")) {
      return Response.json({ error: "Solo ADMIN puede modificar usuarios" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { nombre, cargo, telefono, roles, activo, frentesIds } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // Update user fields (only provided fields)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (cargo !== undefined) updateData.cargo = cargo;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (roles !== undefined) {
        updateData.roles = JSON.stringify(roles);
        updateData.rol = Array.isArray(roles) ? (roles[0] ?? "SOLICITANTE") : roles;
      }
      if (activo !== undefined) updateData.activo = activo;

      await tx.user.update({ where: { id }, data: updateData });

      // Replace frentes assignments if provided
      if (frentesIds !== undefined && Array.isArray(frentesIds)) {
        // Delete all existing frente assignments
        await tx.frenteUsuario.deleteMany({ where: { userId: id } });

        // Create new ones
        if (frentesIds.length > 0) {
          await tx.frenteUsuario.createMany({
            data: frentesIds.map((frenteId: number) => ({ userId: id, frenteId })),
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          email: true,
          cargo: true,
          telefono: true,
          rol: true,
          roles: true,
          activo: true,
          creadoEn: true,
          actualizadoEn: true,
          frentesAsignados: {
            include: { frente: { include: { proyecto: true } } },
          },
        },
      });
    });

    if (!updated) return Response.json({ error: "Error al actualizar usuario" }, { status: 500 });

    return Response.json({
      ...updated,
      roles: (() => { try { return JSON.parse(updated.roles || "[]"); } catch { return [updated.rol]; } })(),
    });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
