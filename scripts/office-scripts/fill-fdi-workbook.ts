/**
 * Office Script de integración para Power Automate.
 *
 * Entrada:
 * - payloadJson: JSON string con { cotizacion, sistemas[] }.
 *
 * El flujo debe copiar FDI_Master.xlsx a la carpeta Docs y ejecutar este script
 * sobre la copia generada.
 */
function main(workbook: ExcelScript.Workbook, payloadJson: string) {
  const payload = JSON.parse(payloadJson || "{}");
  const cotizacion = asRecord(payload.cotizacion);
  const sistemas = Array.isArray(payload.sistemas) ? payload.sistemas.map(asRecord) : [];

  fillHeader(workbook, cotizacion);
  const sheetNames = prepareSystemSheets(workbook, sistemas);
  fillSistemasIndex(workbook, sistemas, sheetNames);
  writePayloadSheet(workbook, payloadJson);
}

const HEADER_ROWS: Record<string, number> = {
  "Creación": 2,
  "ID": 3,
  "Carpeta": 4,
  "Folio": 5,
  "VendedoresLookUp": 6,
  "EmpresaLookUp": 7,
  "Dirección de la empresa": 8,
  "ContactoLookUp": 9,
  "Correo empresarial": 10,
  "Número de teléfono": 11,
  "Moneda de cotización": 12,
  "Flete": 13,
  "País de destino": 14,
  "Estado de destino": 15,
  "Ciudad de destino": 16,
  "Fianzas": 17,
  "Póliza de responsabilidad civil": 18,
  "Monto de póliza": 19,
  "Licitación": 20,
  "Fecha de entrega": 21,
  "Prioridad": 22,
  "Estado": 23,
  "Created By": 24,
  "Notificado": 25,
  "Title": 26,
  "Nombre de contacto": 27,
  "Solicitud o generación": 28,
  "Item Type": 29,
  "Path": 30
};

function fillHeader(workbook: ExcelScript.Workbook, cotizacion: Record<string, unknown>) {
  const sheet = workbook.getWorksheet("Encabezado_Tabla");
  Object.keys(HEADER_ROWS).forEach((key) => {
    sheet.getRange(`C${HEADER_ROWS[key]}`).setValue(formatValue(cotizacion[key]));
  });
}

function prepareSystemSheets(workbook: ExcelScript.Workbook, sistemas: Record<string, unknown>[]): Record<string, string> {
  const sheetNames: Record<string, string> = {};
  const selTemplate = workbook.getWorksheet("SEL_S01_Form");
  let selCount = 0;

  for (let zeroIndex = 0; zeroIndex < sistemas.length; zeroIndex += 1) {
    const sistema = sistemas[zeroIndex];
    const index = zeroIndex + 1;
    const tipo = String(read(sistema, "TipoKey", "tipo", "Tipo", "SEL")).toUpperCase();

    if (tipo === "SEL") {
      selCount += 1;
      const sheetName = safeSheetName(`SEL_S${String(index).padStart(2, "0")}_Form`);
      if (selCount === 1) {
        selTemplate.setName(sheetName);
      } else {
        selTemplate.copy(ExcelScript.WorksheetPositionType.after, selTemplate).setName(sheetName);
      }
      sheetNames[String(index)] = sheetName;
    } else {
      const sheetName = safeSheetName(`${tipo}_S${String(index).padStart(2, "0")}_Form`);
      sheetNames[String(index)] = sheetName;
      addOtSheet(workbook, sistema, sheetName, index);
    }
  }

  for (let zeroIndex = 0; zeroIndex < sistemas.length; zeroIndex += 1) {
    const sistema = sistemas[zeroIndex];
    const index = zeroIndex + 1;
    const tipo = String(read(sistema, "TipoKey", "tipo", "Tipo", "SEL")).toUpperCase();

    if (tipo === "SEL") {
      const sheetName = sheetNames[String(index)];
      fillSelForm(workbook.getWorksheet(sheetName), sistema, index);
      addDetailSheet(workbook, sistema, sheetName.replace("_Form", "_Datos"));
    }
  }

  return sheetNames;
}

function fillSistemasIndex(workbook: ExcelScript.Workbook, sistemas: Record<string, unknown>[], sheetNames: Record<string, string>) {
  const sheet = workbook.getWorksheet("Sistemas_Index");
  sheet.getRange("A4:I92").clear(ExcelScript.ClearApplyTo.contents);

  sistemas.forEach((sistema, zeroIndex) => {
    const index = zeroIndex + 1;
    const row = index + 3;
    const tipo = String(read(sistema, "TipoKey", "tipo", "Tipo", "SEL")).toUpperCase();
    const detalle = read(sistema, "ConsEsp", "HTMLCol", "");

    sheet.getRange(`A${row}:I${row}`).setValues([[
      `${tipo}-${String(index).padStart(4, "0")}`,
      index,
      tipo,
      normalizeMethod(sistema),
      sheetNames[String(index)] || "",
      read(sistema, "NombreSistema", "TipoNombre", "Title", `Sistema ${index}`),
      read(sistema, "NumPedidoCot", "PedidoBase", ""),
      read(sistema, "DiseñoRef", "DisenoRef", ""),
      htmlToText(detalle)
    ]]);
  });

  try {
    const table = workbook.getTable("tblSistemas");
    table.resize(sheet.getRange(`A3:I${Math.max(4, sistemas.length + 3)}`));
  } catch {
    // La plantilla puede existir sin tabla; el índice visible sigue lleno.
  }
}

function fillSelForm(sheet: ExcelScript.Worksheet, sistema: Record<string, unknown>, systemNo: number) {
  const method = normalizeMethod(sistema);
  applySelMethodVisibility(sheet, method);

  setCell(sheet, "B3", systemNo);
  setCell(sheet, "B9", read(sistema, "NumPedidoCot", "PedidoBase", ""));
  setCell(sheet, "B10", read(sistema, "ConsEsp", ""));

  const piezas = rowsFromSummary(
    asArray(read(sistema, "piezas", "Piezas", [])),
    read(sistema, "PiezasResumen", "")
  );
  piezas.slice(0, 10).forEach((piezaRaw, offset) => {
    const pieza = asRecord(piezaRaw);
    const row = 15 + offset;
    sheet.getRange(`A${row}:E${row}`).setValues([[
      read(pieza, "Pieza", "Código", "Codigo", ""),
      read(pieza, "Comentarios", "Comentario", "Descripción", "Descripcion", ""),
      read(pieza, "Cantidad", ""),
      read(pieza, "Unidad", ""),
      read(pieza, "Notas", "")
    ]]);
  });

  const tarimas = asArray(read(sistema, "tarimas", "Tarimas", []));
  const firstTarima = tarimas.length > 0 ? asRecord(tarimas[0]) : {};
  setCell(sheet, "B28", read(firstTarima, "Tipo", ""));
  setCell(sheet, "B30", read(firstTarima, "Alto", ""));
  setCell(sheet, "B31", read(firstTarima, "Frente", ""));
  setCell(sheet, "B32", read(firstTarima, "Fondo", ""));
  setCell(sheet, "B33", read(firstTarima, "ExcedenteFrente", ""));
  setCell(sheet, "B34", read(firstTarima, "ExcedenteFondo", ""));

  setCell(sheet, "B39", read(sistema, "PasilloMin", ""));
  setCell(sheet, "B40", read(sistema, "PasilloMax", ""));
  setCell(sheet, "B41", read(sistema, "AnchoDisp", ""));
  setCell(sheet, "B42", read(sistema, "LargoDisp", ""));
  setCell(sheet, "A46", read(sistema, "ConfNiv", "ConfiguracionNiveles", ""));
  setCell(sheet, "B47", read(sistema, "AltCritMonta", ""));
  setCell(sheet, "B48", read(sistema, "AltCritNiv", ""));
  setCell(sheet, "B51", read(sistema, "DefPorCliente", ""));
  setCell(sheet, "B53", formatValue(read(sistema, "GalvList", "Galvanizado", "")));
  setCell(sheet, "B54", read(sistema, "TipoGalv", ""));
  setCell(sheet, "B55", read(sistema, "PpkgGalv", ""));

  const colores = asArray(read(sistema, "colores", "Colores", []))
    .map((colorRaw) => {
      const color = asRecord(colorRaw);
      const pieza = String(read(color, "Pieza", ""));
      const valor = String(read(color, "Color", ""));
      return pieza || valor ? `${pieza}: ${valor}`.replace(/^: /, "").replace(/: $/, "") : "";
    })
    .filter((value) => value !== "");
  setCell(sheet, "B56", colores.join("; "));

  setCell(sheet, "B57", formatValue(read(sistema, "Ins", "Instalacion", "")));
  setCell(sheet, "B58", formatValue(read(sistema, "MemCalc", "")));
  setCell(sheet, "B59", formatValue(read(sistema, "EstProv", "")));
  setCell(sheet, "B60", formatValue(read(sistema, "ProvExternos", "")));
  setCell(sheet, "B61", read(sistema, "ConsEsp", ""));
}

function addDetailSheet(workbook: ExcelScript.Workbook, sistema: Record<string, unknown>, sheetName: string) {
  const sheet = workbook.addWorksheet(safeSheetName(sheetName));
  sheet.getRange("A1").setValue("Detalle estructurado del sistema");
  sheet.getRange("A2").setValue(read(sistema, "NombreSistema", "Title", sheetName));

  let row = 4;
  row = writeSection(sheet, row, "Piezas", ["Pieza", "Comentarios", "Cantidad", "Unidad", "Notas"], rowsFromSummary(
    asArray(read(sistema, "piezas", "Piezas", [])),
    read(sistema, "PiezasResumen", "")
  ));
  row = writeSection(sheet, row, "Tarimas", ["Tipo", "Alto", "Frente", "Fondo", "ExcedenteFrente", "ExcedenteFondo"], asArray(read(sistema, "tarimas", "Tarimas", [])));
  row = writeSection(sheet, row, "Elementos de seguridad", ["Pieza", "Comentario"], rowsFromSummary(
    asArray(read(sistema, "elementosSeguridad", "ElementosSeguridad", [])),
    read(sistema, "ElementosSeguridadResumen", "")
  ));
  writeSection(sheet, row, "Colores", ["Pieza", "Color"], asArray(read(sistema, "colores", "Colores", [])));

  sheet.getRange("A:H").getFormat().setColumnWidth(140);
}

function writeSection(sheet: ExcelScript.Worksheet, startRow: number, title: string, headers: string[], rows: unknown[]): number {
  sheet.getRange(`A${startRow}`).setValue(title);
  sheet.getRangeByIndexes(startRow, 0, 1, headers.length).setValues([headers]);

  rows.forEach((rowRaw, index) => {
    const row = asRecord(rowRaw);
    const values = headers.map((header) => formatValue(row[header]));
    sheet.getRangeByIndexes(startRow + 1 + index, 0, 1, headers.length).setValues([values]);
  });

  return startRow + rows.length + 3;
}

function addOtSheet(workbook: ExcelScript.Workbook, sistema: Record<string, unknown>, sheetName: string, systemNo: number) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.getRange("A1").setValue("Formulario de Sistema (Otro)");
  sheet.getRange("A3:B7").setValues([
    ["Sistema No", systemNo],
    ["SistemaID", read(sistema, "SistemaId", "SistemaID", "RegistroID", "")],
    ["Descripción", read(sistema, "NombreSistema", "Title", "")],
    ["", ""],
    ["Detalle", htmlToText(read(sistema, "HTMLCol", "HTML", ""))]
  ]);
  sheet.getRange("A:A").getFormat().setColumnWidth(160);
  sheet.getRange("B:B").getFormat().setColumnWidth(520);
  sheet.getRange("B7").getFormat().setWrapText(true);
}

function writePayloadSheet(workbook: ExcelScript.Workbook, payloadJson: string) {
  try {
    workbook.getWorksheet("FDI_Payload_JSON").delete();
  } catch {
    // La hoja no existe en una copia limpia de la plantilla.
  }

  const sheet = workbook.addWorksheet("FDI_Payload_JSON");
  sheet.setVisibility(ExcelScript.SheetVisibility.hidden);
  sheet.getRange("A1").setValue("Payload JSON usado para generar este archivo");

  const chunkSize = 30000;
  for (let index = 0; index < payloadJson.length; index += chunkSize) {
    sheet.getRange(`A${index / chunkSize + 2}`).setValue(payloadJson.substring(index, index + chunkSize));
  }
}

function setCell(sheet: ExcelScript.Worksheet, address: string, value: unknown) {
  sheet.getRange(address).setValue(formatValue(value));
}

function read(obj: Record<string, unknown>, ...keysAndFallback: string[]): unknown {
  const fallback = keysAndFallback.length > 0 ? keysAndFallback[keysAndFallback.length - 1] : "";
  const keys = keysAndFallback.slice(0, -1);
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function formatValue(value: unknown): string | number | boolean {
  if (value === true) return "Sí";
  if (value === false) return "No";
  if (value === undefined || value === null) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function htmlToText(value: unknown): string {
  const html = String(value || "");
  if (!html) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeMethod(system: Record<string, unknown>): string {
  const raw = String(read(system, "TipoDiseño", "MetodoCotizacion", "MétodoCotización", "Diseño")).toLowerCase();
  if (raw.includes("pieza")) return "ListaPiezas";
  if (raw.includes("pedido")) return "PedidoAnterior";
  return "Diseño";
}

function applySelMethodVisibility(sheet: ExcelScript.Worksheet, method: string) {
  setRowsHidden(sheet, "8:10", method !== "PedidoAnterior");
  setRowsHidden(sheet, "12:25", method !== "ListaPiezas");
  setRowsHidden(sheet, "26:61", method !== "Diseño");
}

function setRowsHidden(sheet: ExcelScript.Worksheet, rowsAddress: string, hidden: boolean) {
  sheet.getRange(rowsAddress).setRowHidden(hidden);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function rowsFromSummary(rows: unknown[], summary: unknown): unknown[] {
  if (rows.length > 0) return rows;

  const text = String(summary || "").trim();
  if (!text) return [];

  return text.split(/\r?\n/).filter((line) => line.trim() !== "").map((line) => {
    const parts = line.split(" - ");
    return {
      Pieza: parts[0] || "",
      Comentarios: parts.slice(1).join(" - "),
      Comentario: parts.slice(1).join(" - ")
    };
  });
}

function safeSheetName(name: string): string {
  return name.replace(/[\[\]:*?/\\]/g, "_").substring(0, 31);
}
