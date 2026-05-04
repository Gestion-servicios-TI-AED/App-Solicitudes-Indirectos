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

    const userRoles: string[] = session.user.roles ?? [session.user.rol];

    if (userRoles.includes("ADMIN")) {
      // Full list for ADMIN
      const users = await prisma.user.findMany({
        where: { activo: true },
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
          frentesAsignados: {
            include: { frente: { include: { proyecto: true } } },
          },
        },
        orderBy: { nombre: "asc" },
      });
      // Parse roles JSON and return as array
      return Response.json(
        users.map((u) => ({
          ...u,
          roles: (() => { try { return JSON.parse(u.roles || "[]"); } catch { return [u.rol]; } })(),
        }))
      );
    }

    // Non-admin users get a limited view
    const users = await prisma.user.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        rol: true,
        roles: true,
        cargo: true,
      },
      orderBy: { nombre: "asc" },
    });

    return Response.json(
      users.map((u) => ({
        ...u,
        roles: (() => { try { return JSON.parse(u.roles || "[]"); } catch { return [u.rol]; } })(),
      }))
    );
  } catch (error) {
    console.error("GET /api/users error:", error);
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
    if (!userRoles.includes("ADMIN")) {
      return Response.json({ error: "Solo ADMIN puede crear usuarios" }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, email, password, cargo, telefono, roles, frentesIds } = body;

    if (!nombre || !email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return Response.json(
        { error: "nombre, email, password y roles son obligatorios" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const primaryRol = roles[0] ?? "SOLICITANTE";

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          nombre,
          email,
          password: hashedPassword,
          cargo: cargo ?? null,
          telefono: telefono ?? null,
          rol: primaryRol,
          roles: JSON.stringify(roles),
          activo: true,
        },
      });

      if (frentesIds && Array.isArray(frentesIds) && frentesIds.length > 0) {
        await tx.frenteUsuario.createMany({
          data: frentesIds.map((frenteId: number) => ({
            userId: created.id,
            frenteId,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: created.id },
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
          frentesAsignados: {
            include: { frente: { include: { proyecto: true } } },
          },
        },
      });
    });

    if (!user) return Response.json({ error: "Error al crear usuario" }, { status: 500 });

    return Response.json(
      {
        ...user,
        roles: (() => { try { return JSON.parse(user.roles || "[]"); } catch { return [user.rol]; } })(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
