import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ExcelJS from "exceljs";
import { countBusinessDays } from "@/lib/holidays";

// ─── Types (mirrors CronogramaBuilder types) ──────────────────────────────────

interface ActividadData {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable?: string;
}

interface FaseData {
  numeroFase: number;
  nombreFase: string;
  fechaInicio: string;
  fechaFin: string;
  actividades: ActividadData[];
}

interface CronogramaData {
  tieneFases: boolean;
  fechaInicio: string;
  fechaFin: string;
  fases: FaseData[];
  actividades: ActividadData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  return new Date(iso + "T12:00:00");
}

function formatDateCO(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function businessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = parseDate(start);
  const e = parseDate(end);
  if (e <= s) return 0;
  return countBusinessDays(s, e);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const body: CronogramaData = await request.json();

    if (!body.fechaInicio || !body.fechaFin) {
      return Response.json({ error: "fechaInicio y fechaFin son requeridos" }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Solicitudes Indirectos";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Cronograma", {
      pageSetup: { fitToPage: true, fitToWidth: 1 },
    });

    // ── Column definitions ─────────────────────────────────────────────────────
    sheet.columns = [
      { key: "fase",        header: "Fase",               width: 22 },
      { key: "actividad",   header: "Actividad",          width: 50 },
      { key: "fechaInicio", header: "Fecha Inicio",       width: 16 },
      { key: "fechaFin",    header: "Fecha Fin",          width: 16 },
      { key: "duracion",    header: "Duración (días háb.)", width: 22 },
    ];

    // ── Title row ──────────────────────────────────────────────────────────────
    sheet.insertRow(1, ["CRONOGRAMA DE CONTRATO"]);
    sheet.mergeCells("A1:E1");
    const titleCell = sheet.getCell("A1");
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;

    // ── Sub-title: global dates ────────────────────────────────────────────────
    sheet.insertRow(2, [
      `Período: ${formatDateCO(body.fechaInicio)} — ${formatDateCO(body.fechaFin)}`,
    ]);
    sheet.mergeCells("A2:E2");
    const subCell = sheet.getCell("A2");
    subCell.font = { italic: true, size: 10, color: { argb: "FF374151" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    subCell.alignment = { horizontal: "center" };
    sheet.getRow(2).height = 18;

    // ── Header row (offset +2 because of title rows) ───────────────────────────
    const headerRow = sheet.getRow(3);
    headerRow.values = ["Fase", "Actividad", "Fecha Inicio", "Fecha Fin", "Duración (días háb.)"];
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFBFDBFE" } },
        right: { style: "thin", color: { argb: "FFBFDBFE" } },
      };
    });

    let rowIndex = 4;

    // ── Color alternation ──────────────────────────────────────────────────────
    const COLORS_FASE = ["FFDBEAFE", "FFE0F2FE"]; // light blue alternates
    const COLOR_ACT_EVEN = "FFFFFFFF";
    const COLOR_ACT_ODD = "FFF9FAFB";

    function addRow(
      fase: string,
      actividad: string,
      fechaInicio: string,
      fechaFin: string,
      bgFase: string,
      bgAct: string
    ) {
      const dur = businessDays(fechaInicio, fechaFin);
      const row = sheet.getRow(rowIndex);
      row.values = [
        fase,
        actividad,
        formatDateCO(fechaInicio),
        formatDateCO(fechaFin),
        dur > 0 ? dur : "",
      ];
      row.height = 18;

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const bg = colNum === 1 ? bgFase : bgAct;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { size: 10 };
        cell.alignment = { vertical: "middle", wrapText: colNum === 2 };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
          right: { style: "hair", color: { argb: "FFE5E7EB" } },
        };
        if (colNum >= 3 && colNum <= 4) cell.alignment = { horizontal: "center", vertical: "middle" };
        if (colNum === 5) cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      rowIndex++;
    }

    if (body.tieneFases && body.fases.length > 0) {
      body.fases.forEach((fase, fi) => {
        const bgFase = COLORS_FASE[fi % COLORS_FASE.length];
        // Fase summary row
        const faseDur = businessDays(fase.fechaInicio, fase.fechaFin);
        const faseRow = sheet.getRow(rowIndex);
        faseRow.values = [
          `FASE ${fase.numeroFase}: ${fase.nombreFase}`,
          "",
          formatDateCO(fase.fechaInicio),
          formatDateCO(fase.fechaFin),
          faseDur > 0 ? faseDur : "",
        ];
        sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
        faseRow.height = 20;
        faseRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFase } };
          cell.font = { bold: true, size: 10, color: { argb: "FF1E3A8A" } };
          cell.alignment = { vertical: "middle" };
          if (colNum >= 3 && colNum <= 4) cell.alignment = { horizontal: "center", vertical: "middle" };
          if (colNum === 5) cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FF93C5FD" } },
            bottom: { style: "thin", color: { argb: "FF93C5FD" } },
            right: { style: "hair", color: { argb: "FFE5E7EB" } },
          };
        });
        rowIndex++;

        if (fase.actividades.length > 0) {
          fase.actividades.forEach((act, ai) => {
            const bgAct = ai % 2 === 0 ? COLOR_ACT_EVEN : COLOR_ACT_ODD;
            addRow("", act.descripcion, act.fechaInicio, act.fechaFin, bgAct, bgAct);
          });
        } else {
          addRow("", "(Sin actividades)", fase.fechaInicio, fase.fechaFin, COLOR_ACT_EVEN, COLOR_ACT_EVEN);
        }
      });
    } else {
      const actividades = body.actividades ?? [];
      if (actividades.length === 0) {
        addRow("—", "(Sin actividades)", body.fechaInicio, body.fechaFin, COLOR_ACT_EVEN, COLOR_ACT_EVEN);
      } else {
        actividades.forEach((act, ai) => {
          const bgAct = ai % 2 === 0 ? COLOR_ACT_EVEN : COLOR_ACT_ODD;
          addRow("—", act.descripcion, act.fechaInicio, act.fechaFin, bgAct, bgAct);
        });
      }
    }

    // ── Total row ──────────────────────────────────────────────────────────────
    const totalDur = businessDays(body.fechaInicio, body.fechaFin);
    const totalRow = sheet.getRow(rowIndex);
    totalRow.values = ["TOTAL", "", "", "", totalDur];
    totalRow.height = 22;
    sheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.alignment = { horizontal: colNum === 5 ? "center" : "left", vertical: "middle" };
    });

    // ── Freeze panes at row 4 ──────────────────────────────────────────────────
    sheet.views = [{ state: "frozen", ySplit: 3, activeCell: "A4" }];

    // ── Serialize to buffer ────────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cronograma-${Date.now()}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/solicitudes/cronograma/export error:", error);
    return Response.json({ error: "Error al generar el archivo Excel" }, { status: 500 });
  }
}
