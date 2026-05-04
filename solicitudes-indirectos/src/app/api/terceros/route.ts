import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const aprobadoParam = searchParams.get("aprobado");

    const where =
      aprobadoParam === "true"
        ? { aprobadoDebidaDiligencia: true }
        : aprobadoParam === "false"
        ? { aprobadoDebidaDiligencia: false }
        : {};

    const terceros = await prisma.tercero.findMany({
      where,
      orderBy: { razonSocial: "asc" },
    });

    return Response.json(terceros);
  } catch (error) {
    console.error("GET /api/terceros error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      razonSocial,
      nit,
      representanteLegal,
      cedulaRepresentante,
      correoFirma,
      direccionRepresentante,
      telefonoRepresentante,
      nombreContacto,
      telefonoContacto,
      correoContacto,
      tipoContrato,
    } = body;

    if (
      !razonSocial ||
      !nit ||
      !representanteLegal ||
      !cedulaRepresentante ||
      !correoFirma ||
      !direccionRepresentante ||
      !telefonoRepresentante ||
      !tipoContrato
    ) {
      return Response.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const existing = await prisma.tercero.findUnique({ where: { nit } });
    if (existing) {
      return Response.json({ error: "Ya existe un tercero con ese NIT" }, { status: 409 });
    }

    const tercero = await prisma.tercero.create({
      data: {
        razonSocial,
        nit,
        representanteLegal,
        cedulaRepresentante,
        correoFirma,
        direccionRepresentante,
        telefonoRepresentante,
        nombreContacto,
        telefonoContacto,
        correoContacto,
        tipoContrato,
      },
    });

    return Response.json(tercero, { status: 201 });
  } catch (error) {
    console.error("POST /api/terceros error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
