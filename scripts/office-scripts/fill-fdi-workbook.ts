/**
 * Office Script de integración para Power Automate.
 *
 * Entrada esperada:
 * - payloadJson: string JSON con { cotizacion, sistemas[] }.
 *
 * Uso sugerido en Power Automate:
 * 1. Crear/copiar FDI_Master.xlsx en la carpeta Docs de la cotización.
 * 2. Ejecutar este script sobre la copia recién creada.
 * 3. Pasar payloadJson armado desde Cotizaciones 2026 + Sistemas por cotización
 *    + Sistema selectivo + Sistema Otro.
 */
function main(workbook: ExcelScript.Workbook, payloadJson: string) {
  const payload = JSON.parse(payloadJson || "{}");
  const cotizacion = payload.cotizacion || {};
  const sistemas = payload.sistemas || [];

  const headerRows: Record<string, number> = {
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

  const headerSheet = workbook.getWorksheet("Encabezado_Tabla");
  Object.keys(headerRows).forEach((key) => {
    headerSheet.getRange(`C${headerRows[key]}`).setValue(formatValue(cotizacion[key]));
  });

  const indexSheet = workbook.getWorksheet("Sistemas_Index");
  indexSheet.getRange("A4:I92").clear(ExcelScript.ClearApplyTo.contents);

  sistemas.forEach((sistema: any, idx: number) => {
    const row = idx + 4;
    const tipo = String(read(sistema, "TipoKey", "Tipo", "SEL")).toUpperCase();
    const sheetName = tipo === "SEL" ? `SEL_S${String(idx + 1).padStart(2, "0")}_Form` : `${tipo}_S${String(idx + 1).padStart(2, "0")}_Form`;
    indexSheet.getRange(`A${row}:I${row}`).setValues([[
      `${tipo}-${String(idx + 1).padStart(4, "0")}`,
      idx + 1,
      tipo,
      normalizeMethod(sistema),
      sheetName,
      read(sistema, "NombreSistema", "TipoNombre", `Sistema ${idx + 1}`),
      read(sistema, "NumPedidoCot", "PedidoBase", ""),
      read(sistema, "DiseñoRef", "DisenoRef", ""),
      read(sistema, "ConsEsp", "HTMLCol", "")
    ]]);
  });

  const payloadSheet = workbook.addWorksheet("FDI_Payload_JSON");
  payloadSheet.setVisibility(ExcelScript.SheetVisibility.hidden);
  payloadSheet.getRange("A1").setValue(payloadJson);
}

function read(obj: any, key1: string, key2?: string, fallback: any = ""): any {
  if (obj && obj[key1] !== undefined && obj[key1] !== null && obj[key1] !== "") return obj[key1];
  if (key2 && obj && obj[key2] !== undefined && obj[key2] !== null && obj[key2] !== "") return obj[key2];
  return fallback;
}

function formatValue(value: any): any {
  if (value === true) return "Sí";
  if (value === false) return "No";
  if (value === undefined || value === null) return "";
  return value;
}

function normalizeMethod(system: any): string {
  const raw = String(read(system, "TipoDiseño", "MetodoCotizacion", "Diseño")).toLowerCase();
  if (raw.includes("pieza")) return "ListaPiezas";
  if (raw.includes("pedido")) return "PedidoAnterior";
  return "Diseño";
}
