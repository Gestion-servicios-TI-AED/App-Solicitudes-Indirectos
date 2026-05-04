import { PrismaClient } from "../src/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Proyecto Baia Kristal
  const proyecto = await prisma.proyecto.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: "Baia Kristal" },
  });

  // Proyecto Oliv
  const proyectoOliv = await prisma.proyecto.upsert({
    where: { id: 2 },
    update: {},
    create: { nombre: "Oliv" },
  });

  const frentesData = [
    { nombre: "KALIZA 1", proyectoId: proyecto.id },
    { nombre: "KALIZA 2", proyectoId: proyecto.id },
    { nombre: "KALIZA 3", proyectoId: proyecto.id },
    { nombre: "KALIZA 4", proyectoId: proyecto.id },
    { nombre: "KALA 1",   proyectoId: proyecto.id },
    { nombre: "KALA 2",   proyectoId: proyecto.id },
    { nombre: "KALA 3",   proyectoId: proyecto.id },
    { nombre: "KALA 4",   proyectoId: proyecto.id },
    { nombre: "LIVA",     proyectoId: proyectoOliv.id },
    { nombre: "SEIVA",    proyectoId: proyectoOliv.id },
  ];

  const frentes: Array<{ id: number; nombre: string }> = [];
  for (const f of frentesData) {
    const frente = await prisma.frente.upsert({
      where: { id: frentes.length + 1 },
      update: {},
      create: { nombre: f.nombre, proyectoId: f.proyectoId },
    });
    frentes.push(frente);
  }

  const frenteMap = Object.fromEntries(frentes.map((f) => [f.nombre, f.id]));

  // Usuarios
  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const usersData = [
    {
      nombre: "Stefania Mercado Mejía",
      cargo: "Analista de Proyectos",
      email: "smercado@baiak.com",
      telefono: "3005264631",
      rol: "SOLICITANTE",
      password: hash("Abc123!"),
      frentes: ["KALIZA 1", "KALIZA 2"],
    },
    {
      nombre: "Carlos Rodríguez Peña",
      cargo: "Director de Proyecto – KALIZA",
      email: "crodriguez@baiak.com",
      telefono: "3001112233",
      rol: "DIRECTOR_PROYECTO",
      password: hash("Abc123!"),
      frentes: ["KALIZA 1", "KALIZA 2", "KALIZA 3", "KALIZA 4"],
    },
    {
      nombre: "Valentina Torres Ruiz",
      cargo: "Director de Proyecto – KALA",
      email: "vtorres@baiak.com",
      telefono: "3104445566",
      rol: "DIRECTOR_PROYECTO",
      password: hash("Abc123!"),
      frentes: ["KALA 1", "KALA 2", "KALA 3", "KALA 4"],
    },
    {
      nombre: "Andrés Morales Gómez",
      cargo: "Coordinador de Contratos",
      email: "amorales@baiak.com",
      telefono: "3157778899",
      rol: "CONTRATOS",
      password: hash("Abc123!"),
      frentes: [],
    },
    {
      nombre: "Laura Jiménez Castro",
      cargo: "Coordinador de Controles y Costos",
      email: "ljimenez@baiak.com",
      telefono: "3168889900",
      rol: "CONTROLES",
      password: hash("Abc123!"),
      frentes: [],
    },
    {
      nombre: "Miguel Ángel Suárez",
      cargo: "Director de Controles",
      email: "msuarez@baiak.com",
      telefono: "3119990011",
      rol: "DIRECTOR_CONTROLES",
      password: hash("Abc123!"),
      frentes: [],
    },
    {
      nombre: "Ana Lucía Vargas",
      cargo: "Analista de Contratación",
      email: "avargas@baiak.com",
      telefono: "3002223344",
      rol: "SOLICITANTE",
      password: hash("Abc123!"),
      frentes: ["KALA 1", "KALA 2"],
    },
    {
      nombre: "Admin Sistema",
      cargo: "Administrador",
      email: "admin@baiak.com",
      telefono: "",
      rol: "ADMIN",
      password: hash("Admin123!"),
      frentes: [],
    },
  ];

  const createdUsers: Array<{ id: string; nombre: string; email: string }> = [];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { roles: JSON.stringify([u.rol]) },
      create: {
        nombre: u.nombre,
        cargo: u.cargo,
        email: u.email,
        telefono: u.telefono,
        rol: u.rol,
        roles: JSON.stringify([u.rol]),
        password: u.password,
      },
    });
    createdUsers.push(user);

    // Asignar frentes
    for (const nombreFrente of u.frentes) {
      const frenteId = frenteMap[nombreFrente];
      if (frenteId) {
        await prisma.frenteUsuario.upsert({
          where: { userId_frenteId: { userId: user.id, frenteId } },
          update: {},
          create: { userId: user.id, frenteId },
        });
      }
    }
  }

  // Configuración de aprobadores
  const crodriguez = createdUsers.find((u) => u.email === "crodriguez@baiak.com")!;
  const vtorres = createdUsers.find((u) => u.email === "vtorres@baiak.com")!;

  const aprobadoresConfig = [
    { frente: "KALIZA 1", aprobadorEmail: "crodriguez@baiak.com" },
    { frente: "KALIZA 2", aprobadorEmail: "crodriguez@baiak.com" },
    { frente: "KALIZA 3", aprobadorEmail: "crodriguez@baiak.com" },
    { frente: "KALIZA 4", aprobadorEmail: "crodriguez@baiak.com" },
    { frente: "KALA 1", aprobadorEmail: "vtorres@baiak.com" },
    { frente: "KALA 2", aprobadorEmail: "vtorres@baiak.com" },
    { frente: "KALA 3", aprobadorEmail: "vtorres@baiak.com" },
    { frente: "KALA 4", aprobadorEmail: "vtorres@baiak.com" },
  ];

  for (const config of aprobadoresConfig) {
    const frenteId = frenteMap[config.frente];
    const aprobador = createdUsers.find((u) => u.email === config.aprobadorEmail);
    if (frenteId && aprobador) {
      await prisma.aprobadorFrente.upsert({
        where: { frenteId },
        update: { aprobadorId: aprobador.id },
        create: { frenteId, aprobadorId: aprobador.id },
      });
    }
  }

  // Contadores de consecutivos
  const tipos = [
    "ORDEN_SERVICIO", "CONTRATO", "OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD",
    "TRAMITE_CUENTA", "TRAMITE_FACTURAS", "TRAMITE_CUENTAS_RECURRENTES",
    "TRAMITE_CUENTAS_OCASIONALES", "TRAMITE_BONIFICACIONES_COMISIONES",
  ];
  const anio = new Date().getFullYear();
  for (const tipo of tipos) {
    await prisma.contadorConsecutivo.upsert({
      where: { tipo },
      update: {},
      create: { tipo, anio, ultimo: 0 },
    });
  }

  console.log("✅ Seed completado");
  console.log("\n📋 Usuarios creados (contraseña: Abc123!):");
  for (const u of usersData) {
    console.log(`  ${u.email} — ${u.rol}`);
  }
  console.log("  admin@baiak.com — ADMIN (contraseña: Admin123!)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
