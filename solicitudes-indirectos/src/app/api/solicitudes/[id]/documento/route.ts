import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  TableLayoutType,
} from "docx";
import { formatDate, formatCurrency } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bold(text: string) {
  return new TextRun({ text, bold: true });
}

function plain(text: string | null | undefined) {
  return new TextRun({ text: text ?? "—" });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    children: [bold(text)],
    spacing: { before: 240, after: 120 },
  });
}

function cell(text: string, isHeader = false, shading?: string): TableCell {
  return new TableCell({
    shading: shading
      ? { fill: shading, type: ShadingType.CLEAR, color: "auto" }
      : isHeader
      ? { fill: "1E3A8A", type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            color: isHeader ? "FFFFFF" : "000000",
            size: 20,
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
      }),
    ],
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
    },
  });
}

function infoRow(label: string, value: string | null | undefined): TableRow {
  return new TableRow({
    children: [
      cell(label, false, "F3F4F6"),
      cell(value ?? "—"),
    ],
  });
}

function twoColTable(rows: [string, string | null | undefined][]): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => infoRow(k, v)),
  });
}

function checklistTable(items: { label: string; checked: boolean }[]): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("Documento", true),
          cell("Incluido", true),
        ],
      }),
      ...items.map(
        (item) =>
          new TableRow({
            children: [
              cell(item.label),
              cell(item.checked ? "Sí" : "No", false, item.checked ? "D1FAE5" : "FEE2E2"),
            ],
          })
      ),
    ],
  });
}

function spacer() {
  return new Paragraph({ text: "", spacing: { before: 80, after: 80 } });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    // ── Fetch solicitud ────────────────────────────────────────────────────────
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: numId },
      include: {
        solicitante: {
          select: { id: true, nombre: true, cargo: true, email: true, telefono: true },
        },
        tercero: true,
      },
    });

    if (!solicitud) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // ── Access control ─────────────────────────────────────────────────────────
    const userRol = session.user.rol;
    const userId = session.user.id;
    if (userRol === "SOLICITANTE" || userRol === "DIRECTOR_PROYECTO") {
      if (solicitud.solicitanteId !== userId) {
        const userFrente = await prisma.frenteUsuario.findMany({
          where: { userId },
          select: { frenteId: true },
        });
        const userFrenteIds = userFrente.map((f: { frenteId: number }) => f.frenteId);
        const frentesArr: number[] = JSON.parse(solicitud.frentesIds || "[]");
        const hasAccess = frentesArr.some((fId: number) => userFrenteIds.includes(fId));
        if (!hasAccess) {
          return Response.json({ error: "Sin acceso a esta solicitud" }, { status: 403 });
        }
      }
    }

    // ── Resolve frente names ───────────────────────────────────────────────────
    const frentesIds: number[] = JSON.parse(solicitud.frentesIds || "[]");
    const frenteRecords = await prisma.frente.findMany({
      where: { id: { in: frentesIds } },
      select: { id: true, nombre: true },
    });
    const frenteNames = frenteRecords.map((f: { id: number; nombre: string }) => f.nombre).join(", ");

    const t = solicitud.tercero;
    const sol = solicitud.solicitante;

    // ── Build document ─────────────────────────────────────────────────────────
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: { size: 22, font: "Calibri" },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, bottom: 720, left: 900, right: 720 },
            },
          },
          children: [
            // ── Title ──────────────────────────────────────────────────────────
            new Paragraph({
              children: [
                new TextRun({
                  text: "FORMATO DE SOLICITUD DE CONTRATO",
                  bold: true,
                  size: 32,
                  color: "1E3A8A",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 240 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "AED CONSTRUCTORES S.A.S — PROYECTO BAIA KRISTAL",
                  size: 20,
                  color: "6B7280",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 },
            }),

            // ── Header info ───────────────────────────────────────────────────
            heading("1. ENCABEZADO", HeadingLevel.HEADING_2),
            twoColTable([
              ["Consecutivo", solicitud.consecutivo],
              ["Fecha de Solicitud", formatDate(solicitud.fechaSolicitud)],
              ["Solicitante", sol.nombre],
              ["Cargo", sol.cargo ?? "—"],
              ["Teléfono", sol.telefono ?? "—"],
              ["Correo", sol.email],
            ]),

            spacer(),

            // ── Sección solicitud ─────────────────────────────────────────────
            heading("2. INFORMACIÓN DE LA SOLICITUD"),
            twoColTable([
              ["Área / Frente", frenteNames || "—"],
              ["Proyecto", "Baia Kristal"],
              ["Tipo de Contrato", solicitud.tipoContrato === "OBRA" ? "Obra" : solicitud.tipoContrato === "DISENO" ? "Diseño" : "—"],
              ["Estado", solicitud.estado],
            ]),

            spacer(),

            // ── Creación tercero ──────────────────────────────────────────────
            heading("3. CREACIÓN DE TERCERO"),
            new Paragraph({
              children: [
                plain("¿Requiere creación de tercero? "),
                bold(solicitud.creacionTercero ? "Sí" : "No"),
              ],
            }),

            spacer(),

            // ── Contratante ───────────────────────────────────────────────────
            heading("4. CONTRATANTE"),
            twoColTable([
              ["Nombre", solicitud.contratanteNombre ?? "AED CONSTRUCTORES S.A.S"],
              ["NIT", solicitud.contratanteNit ?? "901237628-1"],
            ]),

            spacer(),

            // ── Contratista ───────────────────────────────────────────────────
            heading("5. CONTRATISTA"),
            t
              ? twoColTable([
                  ["Razón Social", t.razonSocial],
                  ["NIT", t.nit],
                  ["Representante Legal", t.representanteLegal],
                  ["Cédula Representante", t.cedulaRepresentante],
                  ["Correo de Firma", t.correoFirma],
                  ["Dirección Representante", t.direccionRepresentante],
                  ["Teléfono Representante", t.telefonoRepresentante],
                  ...(t.nombreContacto ? [["Nombre Contacto", t.nombreContacto] as [string, string]] : []),
                  ...(t.telefonoContacto ? [["Teléfono Contacto", t.telefonoContacto] as [string, string]] : []),
                  ...(t.correoContacto ? [["Correo Contacto", t.correoContacto] as [string, string]] : []),
                ])
              : new Paragraph({ children: [plain("Sin tercero asignado.")] }),

            spacer(),

            // ── Documentos obligatorios ───────────────────────────────────────
            heading("6. DOCUMENTOS OBLIGATORIOS"),
            checklistTable([
              { label: "Términos de referencia / Especificaciones técnicas", checked: solicitud.docTerminosReferencia },
              { label: "Cámara de comercio", checked: solicitud.docCamaraComercio },
              { label: "Estados financieros", checked: solicitud.docEstadosFinancieros },
              { label: "Estado de resultados", checked: solicitud.docEstadoResultados },
              { label: "SAGRILAFT / Formulario de vinculación", checked: solicitud.docSagrilaft },
              { label: "Composición accionaria", checked: solicitud.docComposicionAccionaria },
              { label: "RUT", checked: solicitud.docRut },
              { label: "Cédula del representante legal", checked: solicitud.docCedulaRepresentante },
              { label: "Certificación bancaria", checked: solicitud.docCertificacionBancaria },
              { label: "Cotización", checked: solicitud.docCotizacion },
            ]),

            spacer(),

            // ── Objeto ────────────────────────────────────────────────────────
            heading("7. OBJETO DEL CONTRATO"),
            new Paragraph({
              children: [plain(solicitud.descripcionActividad)],
              spacing: { after: 120 },
            }),

            spacer(),

            // ── Alcance ───────────────────────────────────────────────────────
            heading("8. ALCANCE"),
            new Paragraph({
              children: [plain(solicitud.alcance)],
              spacing: { after: 120 },
            }),

            spacer(),

            // ── Valor ─────────────────────────────────────────────────────────
            heading("9. VALOR DEL CONTRATO"),
            twoColTable([
              [
                "Valor",
                solicitud.valorFinal
                  ? formatCurrency(Number(solicitud.valorFinal))
                  : "—",
              ],
              ["Valor en letras", solicitud.valorEnLetras ?? "—"],
            ]),

            spacer(),

            // ── Forma de pago ─────────────────────────────────────────────────
            heading("10. FORMA DE PAGO"),
            new Paragraph({
              children: [plain(solicitud.formaPago)],
              spacing: { after: 120 },
            }),

            spacer(),

            // ── Plazo ─────────────────────────────────────────────────────────
            heading("11. PLAZO DE EJECUCIÓN"),
            new Paragraph({
              children: [plain(solicitud.plazoEjecucion)],
              spacing: { after: 120 },
            }),

            spacer(),

            // ── Condiciones especiales ────────────────────────────────────────
            heading("12. CONDICIONES ESPECIALES"),
            new Paragraph({
              children: [plain(solicitud.condicionesEspeciales || "No aplica.")],
              spacing: { after: 120 },
            }),

            spacer(),

            // ── Asunto ────────────────────────────────────────────────────────
            heading("13. ASUNTO"),
            new Paragraph({
              children: [plain(solicitud.asunto)],
            }),

            spacer(),

            // ── Signatures ────────────────────────────────────────────────────
            new Paragraph({ text: "", spacing: { before: 480 } }),
            new Table({
              layout: TableLayoutType.FIXED,
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "_________________________", size: 20 })],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: sol.nombre, bold: true, size: 20 })],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: sol.cargo ?? "Solicitante", size: 18, italics: true })],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "_________________________", size: 20 })],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: "Director de Proyecto", bold: true, size: 20 })],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: "Firma y sello", size: 18, italics: true })],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                      },
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    // Copy into a guaranteed plain ArrayBuffer for BodyInit compatibility
    const arrayBuffer: ArrayBuffer = new Uint8Array(buffer).buffer as ArrayBuffer;

    const safeConsecutivo = solicitud.consecutivo.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `Solicitud-Contrato-${safeConsecutivo}.docx`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/solicitudes/[id]/documento error:", error);
    return Response.json({ error: "Error al generar el documento Word" }, { status: 500 });
  }
}
