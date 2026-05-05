import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const TENANT_ID     = process.env.AZURE_TENANT_ID!;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const FILE_ID       = process.env.SHAREPOINT_FILE_ID!;  // 59577aac-ec37-480c-be54-3c4b6804fcdb

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         "https://graph.microsoft.com/.default",
      }),
    }
  );
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

// ─── Paso 1: resolver el Site ID desde el hostname + path ─────────────────────
async function getSiteId(token: string): Promise<string> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/sites/aedcartagena.sharepoint.com:/sites/COMPRAS",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Site lookup error: ${await res.text()}`);
  const data = await res.json();
  return data.id as string;  // formato: "aedcartagena.sharepoint.com,xxxx,xxxx"
}

// ─── Paso 2: buscar el archivo por su driveItem ID ────────────────────────────
async function downloadExcel(token: string, siteId: string): Promise<Buffer> {
  // Primero obtenemos el drive del sitio
  const driveRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!driveRes.ok) throw new Error(`Drive error: ${await driveRes.text()}`);
  const drive = await driveRes.json();
  const driveId = drive.id as string;

  // Descargamos el archivo por su item ID
  const contentRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${FILE_ID}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!contentRes.ok) throw new Error(`Download error: ${await contentRes.text()}`);

  return Buffer.from(await contentRes.arrayBuffer());
}

// ─── Parsear Excel ────────────────────────────────────────────────────────────
interface ExcelRow {
  razonSocial:      string;
  tipoContrato:     string;
  aprobadoDD:       boolean;
  confidencialidad: boolean;
}

function parseExcel(buffer: Buffer): ExcelRow[] {
  const wb   = XLSX.read(buffer, { type: "buffer" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows
    .filter((row) => row["CONTRATISTA"])
    .map((row) => ({
      razonSocial:      String(row["CONTRATISTA"] ?? "").trim(),
      tipoContrato:     String(row["AREA"] ?? "").trim().toUpperCase(),
      aprobadoDD:       Boolean(row["DEBIDA DILIGENCIA"]),
      confidencialidad: Boolean(row["CONFIDENCIALIDAD"]),
    }));
}

// ─── Upsert ───────────────────────────────────────────────────────────────────
async function upsertTerceros(rows: ExcelRow[]) {
  const results = await Promise.allSettled(
    rows.map((row) =>
      prisma.tercero.upsert({
        where:  { razonSocial: row.razonSocial },
        update: {
          tipoContrato:             row.tipoContrato,
          aprobadoDebidaDiligencia: row.aprobadoDD,
          confidencialidad:         row.confidencialidad,
        },
        create: {
          razonSocial:              row.razonSocial,
          nit:                      "",
          tipoContrato:             row.tipoContrato,
          aprobadoDebidaDiligencia: row.aprobadoDD,
          confidencialidad:         row.confidencialidad,
        },
      })
    )
  );
  const errors = results.filter((r) => r.status === "rejected").length;
  return { total: rows.length, errors };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST() {
  try {
    const token  = await getAccessToken();
    const siteId = await getSiteId(token);          // ← resuelve el ID real
    const buffer = await downloadExcel(token, siteId);
    const rows   = parseExcel(buffer);
    const stats  = await upsertTerceros(rows);

    return NextResponse.json({
      ok: true,
      message: `Sincronizados ${stats.total - stats.errors} registros. Errores: ${stats.errors}.`,
      ...stats,
    });
  } catch (error) {
    console.error("[sync-sharepoint]", error);
    return NextResponse.json({ ok: false, message: String(error) }, { status: 500 });
  }
}