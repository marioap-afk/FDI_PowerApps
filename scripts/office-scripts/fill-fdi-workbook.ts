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
  const payloadText = payloadJson || "{}";
  const payload = asRecord(JSON.parse(payloadText));
  const cotizacion = asRecord(payload.cotizacion);
  const sistemas = asRecordArray(payload.sistemas);
  const layoutConfig = readLayoutConfig(workbook);

  fillHeader(workbook, cotizacion);
  const sheetNames = prepareSystemSheets(workbook, sistemas, layoutConfig);
  fillSistemasIndex(workbook, sistemas, sheetNames);
  writePayloadSheet(workbook, JSON.stringify(payload, null, 2));
}

const HEADER_SHEET = "Datos de cotización";
const SYSTEMS_INDEX_SHEET = "Índice de sistemas";
const PAYLOAD_SHEET = "FDI_Payload_JSON";
const TABLE_CONFIG_SHEET = "FDI_Table_Config";

const TYPE_TEMPLATES: Record<string, string> = {
  SEL: "SEL_S01_Form",
  DIN: "DIN_S01_Form",
  PBK: "PBK_S01_Form",
  DRV: "DRV_S01_Form",
  CAN: "CAN_S01_Form",
  MEZ: "MEZ_S01_Form",
  CFL: "CFL_S01_Form",
  MZL: "MZL_S01_Form"
};

const HEADER_ROWS: Array<[number, string[]]> = [
  [6, ["Folio"]],
  [7, ["VendedoresLookUp", "Vendedor", "VendedorNombre"]],
  [8, ["EmpresaLookUp", "Cliente", "Title"]],
  [9, ["ContactoLookUp", "Nombre de contacto", "Contacto"]],
  [10, ["Dirección de la empresa", "DireccionEmpresa", "Dirección"]],
  [11, ["Correo empresarial", "Correo", "Email"]],
  [12, ["Número de teléfono", "Telefono", "Teléfono"]],
  [15, ["Moneda de cotización", "Moneda"]],
  [16, ["Flete"]],
  [17, ["País de destino", "PaisDestino", "País de envío"]],
  [18, ["Estado de destino", "EstadoDestino", "Estado de envío"]],
  [19, ["Ciudad de destino", "CiudadDestino", "Ciudad de envío"]],
  [22, ["Fianzas"]],
  [23, ["Póliza de responsabilidad civil", "PolizaResponsabilidadCivil"]],
  [24, ["Monto de póliza", "MontoPoliza"]],
  [25, ["Licitación", "Licitacion"]],
  [26, ["Prioridad", "Prioridad de cotización"]],
  [29, ["Fecha de entrega", "FechaEntrega"]],
  [30, ["Fecha FDI", "Creación", "Created"]],
  [33, ["Notas generales", "Notas", "Comentarios", "Consideraciones especiales"]],
  [34, ["DocsUrl", "DocsLink", "Documentos"]]
];

interface CommonLayout {
  designEnd: number;
  acabado: number;
  galv: number;
  tipoGalv: number;
  precioGalv: number;
  services: number;
  comments: number;
}

interface TableDefinition {
  baseName: string;
  range: string;
  headers: string[];
  aliases: string[][];
  previewRanges?: Record<string, string>;
}

interface LayoutConfig {
  tables: Record<string, TableDefinition>;
}

const COMMON_LAYOUT: Record<string, CommonLayout> = {
  SEL: { designEnd: 63, acabado: 66, galv: 67, tipoGalv: 68, precioGalv: 69, services: 78, comments: 92 },
  DIN: { designEnd: 71, acabado: 74, galv: 75, tipoGalv: 76, precioGalv: 77, services: 86, comments: 100 },
  PBK: { designEnd: 71, acabado: 74, galv: 75, tipoGalv: 76, precioGalv: 77, services: 86, comments: 100 },
  DRV: { designEnd: 73, acabado: 76, galv: 77, tipoGalv: 78, precioGalv: 79, services: 88, comments: 102 },
  CAN: { designEnd: 62, acabado: 65, galv: 66, tipoGalv: 67, precioGalv: 68, services: 77, comments: 91 },
  MEZ: { designEnd: 74, acabado: 77, galv: 78, tipoGalv: 79, precioGalv: 80, services: 89, comments: 103 },
  CFL: { designEnd: 67, acabado: 70, galv: 71, tipoGalv: 72, precioGalv: 73, services: 82, comments: 96 },
  MZL: { designEnd: 86, acabado: 89, galv: 90, tipoGalv: 91, precioGalv: 92, services: 101, comments: 115 }
};

function fillHeader(workbook: ExcelScript.Workbook, cotizacion: Record<string, unknown>) {
  const sheet = workbook.getWorksheet(HEADER_SHEET);
  HEADER_ROWS.forEach(([row, aliases]) => {
    setCell(sheet, `B${row}`, pick(cotizacion, aliases, ""));
  });
}

function prepareSystemSheets(workbook: ExcelScript.Workbook, sistemas: Record<string, unknown>[], layoutConfig: LayoutConfig): Record<string, string> {
  const sheetNames: Record<string, string> = {};
  const templateByType: Record<string, ExcelScript.Worksheet> = {};
  const lastByType: Record<string, ExcelScript.Worksheet> = {};
  const usedTypes: Record<string, boolean> = {};
  const toFill: Array<[ExcelScript.Worksheet, string, Record<string, unknown>, number]> = [];

  sistemas.forEach((sistema, zeroIndex) => {
    const index = zeroIndex + 1;
    const tipo = String(read(sistema, "TipoKey", "tipo", "Tipo", "SEL")).toUpperCase();
    const sheetName = safeSheetName(`${tipo}_S${String(index).padStart(2, "0")}_Form`);
    sheetNames[String(index)] = sheetName;

    if (TYPE_TEMPLATES[tipo]) {
      let sheet: ExcelScript.Worksheet;
      if (!templateByType[tipo]) {
        sheet = workbook.getWorksheet(TYPE_TEMPLATES[tipo]);
        sheet.setName(sheetName);
        templateByType[tipo] = sheet;
        lastByType[tipo] = sheet;
        usedTypes[tipo] = true;
      } else {
        sheet = templateByType[tipo].copy(ExcelScript.WorksheetPositionType.after, lastByType[tipo]);
        sheet.setName(sheetName);
        lastByType[tipo] = sheet;
      }
      toFill.push([sheet, tipo, sistema, index]);
    } else {
      addOtSheet(workbook, sistema, sheetName, index);
    }
  });

  Object.keys(TYPE_TEMPLATES).forEach((tipo) => {
    if (!usedTypes[tipo]) {
      const unusedTemplate = tryGetWorksheet(workbook, TYPE_TEMPLATES[tipo]);
      if (unusedTemplate) unusedTemplate.delete();
    }
  });

  toFill.forEach(([sheet, tipo, sistema, index]) => {
    fillSupportedForm(sheet, tipo, sistema, index, layoutConfig);
  });

  return sheetNames;
}

function fillSistemasIndex(workbook: ExcelScript.Workbook, sistemas: Record<string, unknown>[], sheetNames: Record<string, string>) {
  const sheet = workbook.getWorksheet(SYSTEMS_INDEX_SHEET);
  clearTableArea(sheet, 6, Math.max(getUsedRowCount(sheet), sistemas.length + 5), 6);

  sistemas.forEach((sistema, zeroIndex) => {
    const index = zeroIndex + 1;
    const row = index + 5;
    const tipo = String(read(sistema, "TipoKey", "tipo", "Tipo", "SEL")).toUpperCase();
    sheet.getRange(`A${row}:F${row}`).setValues([[
      index,
      tipo,
      formatValue(read(sistema, "NombreSistema", "TipoNombre", "Title", `Sistema ${index}`)),
      methodLabel(sistema),
      sheetNames[String(index)] || "",
      htmlToText(read(sistema, "ConsEsp", "HTMLCol", "Comentarios", ""))
    ]]);
  });

  try {
    const table = workbook.getTable("tblSistemas");
    table.resize(sheet.getRange(`A5:F${Math.max(6, sistemas.length + 5)}`));
  } catch {
    // La plantilla puede existir sin tabla; el índice visible sigue lleno.
  }
}

function fillIdentityAndMethod(sheet: ExcelScript.Worksheet, tipo: string, sistema: Record<string, unknown>, systemNo: number) {
  applyMethodVisibility(sheet, tipo, sistema);
  setCell(sheet, "B5", systemNo);
  setCell(sheet, "B6", read(sistema, "SistemaId", "SistemaID", "RegistroID", systemNo));
  setCell(sheet, "B7", methodLabel(sistema));
  setCell(sheet, "B8", read(sistema, "NombreSistema", "TipoNombre", "Title", `Sistema ${systemNo}`));
  setCell(sheet, "B12", read(sistema, "FolioCotizacionAnterior", "FolioCotAnterior", ""));
  setCell(sheet, "B13", read(sistema, "FolioPedidoAnterior", "PedidoBase", "NumPedidoCot", ""));
  setCell(sheet, "B14", read(sistema, "ComentariosReferencia", "ConsEsp", ""));
  setCell(sheet, "B25", read(sistema, "AdjuntarImagenLayout", "RequiereAdjuntarLayout", ""));
  setCell(sheet, "B26", read(sistema, "DocsUrl", "DocsLink", "Documentos", ""));
}

function fillCommon(sheet: ExcelScript.Worksheet, tipo: string, sistema: Record<string, unknown>) {
  const layout = COMMON_LAYOUT[tipo];
  const acabado = acabadoValue(sistema);
  const tipoGalv = tipoGalvanizadoFromAcabado(acabado);
  setCell(sheet, `B${layout.acabado}`, acabado);
  setCell(sheet, `B${layout.galv}`, galvanizadoFromAcabado(acabado));
  setCell(sheet, `B${layout.tipoGalv}`, tipoGalv);
  setCell(sheet, `B${layout.precioGalv}`, tipoGalv === "Frio" || tipoGalv === "Caliente" ? read(sistema, "PpkgGalv", "Precio por kilogramo galvanizado", "") : "");

  const serviceRow = layout.services;
  setCell(sheet, `B${serviceRow}`, read(sistema, "Ins", "Instalacion", "Instalación", ""));
  setCell(sheet, `B${serviceRow + 1}`, read(sistema, "CostoInstalacion", "Costo instalación", ""));
  setCell(sheet, `B${serviceRow + 2}`, read(sistema, "ComentariosInstalacion", "Comentarios instalación", ""));
  setCell(sheet, `B${serviceRow + 3}`, read(sistema, "MemCalc", "Memoria de cálculo", ""));
  setCell(sheet, `B${serviceRow + 4}`, read(sistema, "CostoMemCalculo", "Costo memoria cálculo", ""));
  setCell(sheet, `B${serviceRow + 5}`, read(sistema, "EstProv", "Unirse a estructura de otro proveedor", ""));
  setCell(sheet, `B${serviceRow + 6}`, read(sistema, "ComentariosEstructura", "Comentarios estructura", ""));
  setCell(sheet, `B${serviceRow + 7}`, read(sistema, "ProvExternos", "Proveedores externos", ""));
  setCell(sheet, `B${layout.comments}`, read(sistema, "ConsEsp", "Consideraciones especiales", "Comentarios", ""));
}

function fillSupportedForm(sheet: ExcelScript.Worksheet, tipo: string, sistema: Record<string, unknown>, systemNo: number, layoutConfig: LayoutConfig) {
  fillIdentityAndMethod(sheet, tipo, sistema, systemNo);

  if (tipo === "SEL") {
    fillTarimaBlock(sheet, sistema, 29);
    fillAreaAndLevels(sheet, sistema, 38, 43, true);
  } else if (tipo === "DIN" || tipo === "PBK") {
    fillTarimaBlock(sheet, sistema, 29);
    fillRack(sheet, sistema, 38, true);
    fillAreaAndLevels(sheet, sistema, 46, 51, true);
  } else if (tipo === "DRV") {
    fillTarimaBlock(sheet, sistema, 29);
    setCell(sheet, "B38", read(sistema, "FrentesBuscados", "Frentes buscados", ""));
    setCell(sheet, "B39", read(sistema, "FondosBuscados", "Fondos buscados", ""));
    setCell(sheet, "B40", read(sistema, "NivelesBuscados", "Niveles buscados", ""));
    setCell(sheet, "B42", read(sistema, "TipoCapturaMontacargas", ""));
    setCell(sheet, "B43", read(sistema, "AlturaCabinaMontacargas", ""));
    setCell(sheet, "B44", read(sistema, "AnchoTotalMontacargas", ""));
    setCell(sheet, "B45", read(sistema, "AnchoMastilMontacargas", ""));
    setCell(sheet, "B46", read(sistema, "ModeloMontacargas", ""));
    fillAreaAndLevels(sheet, sistema, 48, 53, true);
  } else if (tipo === "CAN") {
    setCell(sheet, "B29", read(sistema, "TipoProducto", ""));
    setCell(sheet, "B30", read(sistema, "LongitudCarga", ""));
    setCell(sheet, "B31", read(sistema, "SeccionCarga", ""));
    setCell(sheet, "B32", read(sistema, "PesoCarga", ""));
    setCell(sheet, "B33", read(sistema, "CantidadPorNivel", ""));
    setCell(sheet, "B35", read(sistema, "TipoGondola", "Tipo góndola", ""));
    setCell(sheet, "B37", read(sistema, "PasilloMax", "Pasillo máximo", ""));
    setCell(sheet, "B38", read(sistema, "PasilloMin", "Pasillo mínimo", ""));
    setCell(sheet, "B39", read(sistema, "AnchoDisp", "Ancho disponible", ""));
    setCell(sheet, "B40", read(sistema, "LargoDisp", "Largo disponible", ""));
    setCell(sheet, "B42", read(sistema, "ConsiderarAlturaMaxMonta", ""));
    setCell(sheet, "B43", read(sistema, "AltCritMonta", "Altura crítica de montacargas", ""));
    setCell(sheet, "B44", read(sistema, "ConsiderarAlturaNave", ""));
    setCell(sheet, "B45", read(sistema, "AlturaMaxNave", "Altura máxima nave", ""));
    setCell(sheet, "B46", read(sistema, "AlturaMinNave", "Altura mínima nave", ""));
    setCell(sheet, "B47", read(sistema, "AdjuntarImagenLayout", "Requiere adjuntar layout", ""));
    setCell(sheet, "B48", read(sistema, "ExisteDefCliente", "Existe definición cliente", ""));
    setCell(sheet, "B49", read(sistema, "ComentariosConfigCliente", "DefPorCliente", "Definido por el cliente", ""));
  } else if (tipo === "MEZ") {
    setCell(sheet, "B39", read(sistema, "AlturaRecomendadaEntrepiso", "Altura recomendada entrepiso", ""));
    setCell(sheet, "B40", read(sistema, "CantidadEntrepisos", "Cantidad entrepisos", ""));
    setCell(sheet, "B41", read(sistema, "RequiereElevador", ""));
    setCell(sheet, "B42", read(sistema, "EspecificacionElevador", "Especificación elevador", ""));
    setCell(sheet, "B43", read(sistema, "TipoPiso", "Tipo piso", ""));
    setCell(sheet, "B44", read(sistema, "UsaCarrito", ""));
    setCell(sheet, "B45", read(sistema, "MedidasCarrito", ""));
    setCell(sheet, "B46", read(sistema, "NumeroRuedas", "Número ruedas", ""));
    setCell(sheet, "B47", read(sistema, "TipoRueda", ""));
    setCell(sheet, "B48", read(sistema, "MedidaRueda", ""));
    setCell(sheet, "B49", read(sistema, "PesoCarrito", ""));
    setCell(sheet, "B50", read(sistema, "RequiereEscaleras", ""));
    fillAreaAndLevels(sheet, sistema, 52, 56, false);
  } else if (tipo === "CFL") {
    fillRack(sheet, sistema, 39, false);
    fillAreaAndLevels(sheet, sistema, 45, 49, false);
  } else if (tipo === "MZL") {
    setCell(sheet, "B29", read(sistema, "CantidadPisos", ""));
    setCell(sheet, "B30", read(sistema, "CargaPorM2", ""));
    setCell(sheet, "B31", read(sistema, "EsModulado", ""));
    setCell(sheet, "B32", read(sistema, "ZonaModulada", ""));
    setCell(sheet, "B33", read(sistema, "UsaTarimas", ""));
    setCell(sheet, "B34", read(sistema, "RequiereElevador", ""));
    setCell(sheet, "B35", read(sistema, "EspecificacionElevador", "Especificación elevador", ""));
    setCell(sheet, "B36", read(sistema, "TipoPiso", "Tipo piso", ""));
    setCell(sheet, "B37", read(sistema, "UsaCarrito", ""));
    setCell(sheet, "B38", read(sistema, "MedidasCarrito", ""));
    setCell(sheet, "B39", read(sistema, "NumeroRuedas", "Número ruedas", ""));
    setCell(sheet, "B40", read(sistema, "TipoRueda", ""));
    setCell(sheet, "B41", read(sistema, "MedidaRueda", ""));
    setCell(sheet, "B42", read(sistema, "PesoCarrito", ""));
    setCell(sheet, "B43", read(sistema, "RequiereEscaleras", ""));
    setCell(sheet, "B45", read(sistema, "MetodoSeparacionColumnas", "Método separación columnas", ""));
    setCell(sheet, "B46", read(sistema, "SeparacionColumnasManual", "Separación columnas manual", ""));
    fillAreaAndLevels(sheet, sistema, 64, 68, false);
  }

  fillCommon(sheet, tipo, sistema);
  fillDetailTables(sheet, tipo, sistema, layoutConfig);
}

function fillTarimaBlock(sheet: ExcelScript.Worksheet, sistema: Record<string, unknown>, baseRow: number) {
  const tarimas = asRecordArray(read(sistema, "tarimas", "Tarimas", []));
  const first = tarimas.length > 0 ? tarimas[0] : {};
  setCell(sheet, `B${baseRow}`, read(first, "Peso", "PesoTarima", ""));
  setCell(sheet, `B${baseRow + 1}`, read(first, "Alto", "AltoTarima", ""));
  setCell(sheet, `B${baseRow + 2}`, read(first, "Frente", "FrenteTarima", ""));
  setCell(sheet, `B${baseRow + 3}`, read(first, "Fondo", "FondoTarima", ""));
  setCell(sheet, `B${baseRow + 4}`, read(first, "Excedente", hasAnyValue(first, ["ExcedenteFrente", "ExcedenteFondo"])));
  setCell(sheet, `B${baseRow + 5}`, read(first, "ExcedenteFrente", "Excedente frente", ""));
  setCell(sheet, `B${baseRow + 6}`, read(first, "ExcedenteFondo", "Excedente fondo", ""));
  setCell(sheet, `B${baseRow + 7}`, read(first, "Huella", "HuellaTarima", ""));
}

function fillAreaAndLevels(sheet: ExcelScript.Worksheet, sistema: Record<string, unknown>, areaRow: number, levelsRow: number, includeMontacargas: boolean) {
  let offset = 0;
  if (includeMontacargas) {
    setCell(sheet, `B${areaRow}`, read(sistema, "PasilloMax", "Pasillo máximo", ""));
    setCell(sheet, `B${areaRow + 1}`, read(sistema, "PasilloMin", "Pasillo mínimo", ""));
    setCell(sheet, `B${areaRow + 2}`, read(sistema, "AnchoDisp", "Ancho disponible", ""));
    setCell(sheet, `B${areaRow + 3}`, read(sistema, "LargoDisp", "Largo disponible", ""));
    setCell(sheet, `B${levelsRow}`, read(sistema, "ConsiderarAlturaMaxMonta", ""));
    setCell(sheet, `B${levelsRow + 1}`, read(sistema, "AltCritMonta", "Altura crítica de montacargas", ""));
    offset = 2;
  } else {
    setCell(sheet, `B${areaRow}`, read(sistema, "AnchoDisp", "Ancho disponible", ""));
    setCell(sheet, `B${areaRow + 1}`, read(sistema, "LargoDisp", "Largo disponible", ""));
    setCell(sheet, `B${areaRow + 2}`, read(sistema, "AnchoPasilloPickeo", "Ancho pasillo pickeo", ""));
  }
  setCell(sheet, `B${levelsRow + offset}`, read(sistema, "ConsiderarAlturaNave", ""));
  setCell(sheet, `B${levelsRow + offset + 1}`, read(sistema, "AlturaMaxNave", "Altura máxima nave", ""));
  setCell(sheet, `B${levelsRow + offset + 2}`, read(sistema, "AlturaMinNave", "Altura mínima nave", ""));
  setCell(sheet, `B${levelsRow + offset + 3}`, read(sistema, "AdjuntarImagenLayout", "Requiere adjuntar layout", ""));
  setCell(sheet, `B${levelsRow + offset + 4}`, read(sistema, "ExisteDefCliente", "Existe definición cliente", ""));
  setCell(sheet, `B${levelsRow + offset + 5}`, read(sistema, "ComentariosConfigCliente", "DefPorCliente", "Definido por el cliente", ""));
}

function fillRack(sheet: ExcelScript.Worksheet, sistema: Record<string, unknown>, startRow: number, highImpact: boolean) {
  setCell(sheet, `B${startRow}`, read(sistema, "FrentesBuscados", "Frentes buscados", ""));
  setCell(sheet, `B${startRow + 1}`, read(sistema, "FondosBuscados", "Fondos buscados", ""));
  setCell(sheet, `B${startRow + 2}`, read(sistema, "NivelesBuscados", "Niveles buscados", ""));
  setCell(sheet, `B${startRow + 3}`, read(sistema, "TipoRodamiento", "Tipo rodamiento", ""));
  setCell(sheet, `B${startRow + 4}`, read(sistema, "MetodoCalculoEntrecentros", "Método cálculo entrecentros", ""));
  if (highImpact) {
    setCell(sheet, `B${startRow + 5}`, read(sistema, "UtilizarRodamientoAltoImpacto", ""));
    setCell(sheet, `B${startRow + 6}`, read(sistema, "EspecificacionRodamientoAltoImpacto", "Especificación rodamiento alto impacto", ""));
  }
}

function addOtSheet(workbook: ExcelScript.Workbook, sistema: Record<string, unknown>, sheetName: string, systemNo: number) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.getRange("A1").setValue("Formulario de Sistema (Otro)");
  sheet.getRange("A3:B8").setValues([
    ["Sistema No", systemNo],
    ["SistemaID", formatValue(read(sistema, "SistemaId", "SistemaID", "RegistroID", ""))],
    ["Descripción", formatValue(read(sistema, "NombreSistema", "Title", ""))],
    ["Documentos", formatValue(read(sistema, "DocsUrl", "DocsLink", "Documentos", ""))],
    ["", ""],
    ["Detalle", htmlToText(read(sistema, "HTMLCol", "HTML", ""))]
  ]);
  sheet.getRange("A:A").getFormat().setColumnWidth(160);
  sheet.getRange("B:B").getFormat().setColumnWidth(520);
  sheet.getRange("B8").getFormat().setWrapText(true);
}

function writePayloadSheet(workbook: ExcelScript.Workbook, payloadJson: string) {
  const existing = tryGetWorksheet(workbook, PAYLOAD_SHEET);
  if (existing) existing.delete();

  const sheet = workbook.addWorksheet(PAYLOAD_SHEET);
  sheet.setVisibility(ExcelScript.SheetVisibility.hidden);
  sheet.getRange("A1").setValue("Payload JSON usado para generar este archivo");

  const chunkSize = 30000;
  for (let index = 0; index < payloadJson.length; index += chunkSize) {
    sheet.getRange(`A${index / chunkSize + 2}`).setValue(payloadJson.substring(index, index + chunkSize));
  }
}

function readLayoutConfig(workbook: ExcelScript.Workbook): LayoutConfig {
  const sheet = workbook.getWorksheet(TABLE_CONFIG_SHEET);
  const usedRange = sheet.getUsedRange();
  if (!usedRange || usedRange.getRowCount() < 2) {
    throw new Error(`La plantilla no contiene configuración de tablas en ${TABLE_CONFIG_SHEET}. Regenera y sube FDI_Master.xlsx.`);
  }

  const values = sheet.getRangeByIndexes(1, 0, usedRange.getRowCount() - 1, 1).getValues();
  const jsonText = values.map((row) => String(row[0] || "")).join("");
  return JSON.parse(jsonText) as LayoutConfig;
}

function fillDetailTables(sheet: ExcelScript.Worksheet, tipo: string, sistema: Record<string, unknown>, layoutConfig: LayoutConfig) {
  writeSystemTable(
    sheet,
    tipo,
    layoutConfig,
    "piezas",
    rowsFromSummary(asRecordArray(read(sistema, "piezas", "Piezas", [])), read(sistema, "PiezasResumen", ""))
  );
  writeSystemTable(sheet, tipo, layoutConfig, "tarimas", asRecordArray(read(sistema, "tarimas", "Tarimas", [])));
  writeSystemTable(sheet, tipo, layoutConfig, "productos", asRecordArray(read(sistema, "productos", "Productos", [])));
  writeSystemTable(
    sheet,
    tipo,
    layoutConfig,
    "elementosSeguridad",
    rowsFromSummary(
      asRecordArray(read(sistema, "elementosSeguridad", "ElementosSeguridad", [])),
      read(sistema, "ElementosSeguridadResumen", "")
    )
  );
  writeSystemTable(sheet, tipo, layoutConfig, "piezasEspeciales", asRecordArray(read(sistema, "piezasEspeciales", "PiezasEspeciales", [])));
  writeSystemTable(sheet, tipo, layoutConfig, "colores", asRecordArray(read(sistema, "colores", "Colores", [])));
  writeSystemTable(sheet, tipo, layoutConfig, "proveedoresExternos", asRecordArray(read(sistema, "proveedoresExternos", "ProveedoresExternos", [])));
}

function writeSystemTable(sheet: ExcelScript.Worksheet, tipo: string, layoutConfig: LayoutConfig, tableKey: string, rows: Record<string, unknown>[]) {
  const definition = layoutConfig.tables[tableKey];
  writeTableToRange(sheet, tableRangeFor(sheet, tipo, definition), rows, definition.aliases);
  const previewRef = definition.previewRanges ? definition.previewRanges[tipo] : "";
  if (previewRef) {
    writeTableToRange(sheet, sheet.getRange(previewRef), rows, definition.aliases);
  }
}

function tableRangeFor(sheet: ExcelScript.Worksheet, tipo: string, definition: TableDefinition): ExcelScript.Range {
  const table = findSheetTable(sheet, definition.baseName, tipo);
  if (table) {
    return table.getRange();
  }
  return sheet.getRange(definition.range);
}

function findSheetTable(sheet: ExcelScript.Worksheet, baseName: string, tipo: string): ExcelScript.Table | undefined {
  const expectedPrefix = `${baseName}_${tipo}`;
  const tables = sheet.getTables();
  for (const table of tables) {
    const name = table.getName();
    if (name === expectedPrefix || name.indexOf(`${expectedPrefix}_`) === 0) return table;
  }
  for (const table of tables) {
    if (table.getName().indexOf(`${baseName}_`) === 0) return table;
  }
  return undefined;
}

function writeTableToRange(sheet: ExcelScript.Worksheet, tableRange: ExcelScript.Range, rows: Record<string, unknown>[], columns: string[][]) {
  const dataRowCount = Math.max(0, tableRange.getRowCount() - 1);
  if (dataRowCount < 1 || columns.length < 1) return;

  const startRowIndex = tableRange.getRowIndex() + 1;
  const startColumnIndex = tableRange.getColumnIndex();
  sheet.getRangeByIndexes(startRowIndex, startColumnIndex, dataRowCount, columns.length).clear(ExcelScript.ClearApplyTo.contents);

  const capacity = Math.max(0, dataRowCount);
  rows.slice(0, capacity).forEach((row, rowOffset) => {
    const values = columns.map((aliases) => formatValue(pick(row, aliases, "")));
    sheet.getRangeByIndexes(startRowIndex + rowOffset, startColumnIndex, 1, values.length).setValues([values]);
  });
}

function clearTableArea(sheet: ExcelScript.Worksheet, startRow: number, endRow: number, columnCount: number) {
  if (endRow < startRow || columnCount < 1) return;
  sheet.getRangeByIndexes(startRow - 1, 0, endRow - startRow + 1, columnCount).clear(ExcelScript.ClearApplyTo.contents);
}

function applyMethodVisibility(sheet: ExcelScript.Worksheet, tipo: string, sistema: Record<string, unknown>) {
  const method = normalizeMethod(sistema);
  setRowsHidden(sheet, 11, 14, method !== "PedidoAnterior");
  setRowsHidden(sheet, 15, 22, method !== "ListaPiezas");
  setRowsHidden(sheet, 24, 26, method !== "Planos");
  setRowsHidden(sheet, 27, COMMON_LAYOUT[tipo].designEnd, method === "PedidoAnterior" || method === "ListaPiezas");
}

function setRowsHidden(sheet: ExcelScript.Worksheet, startRow: number, endRow: number, hidden: boolean) {
  sheet.getRange(`${startRow}:${endRow}`).setRowHidden(hidden);
}

function setCell(sheet: ExcelScript.Worksheet, address: string, value: unknown) {
  sheet.getRange(address).setValue(formatValue(value));
}

function read(obj: Record<string, unknown>, ...keysAndFallback: unknown[]): unknown {
  const fallback = keysAndFallback.length > 0 ? keysAndFallback[keysAndFallback.length - 1] : "";
  const keys = keysAndFallback.slice(0, -1).filter((key): key is string => typeof key === "string");
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function pick(obj: Record<string, unknown>, aliases: string[], fallback: unknown): unknown {
  for (const key of aliases) {
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

function normalizeMethod(system: Record<string, unknown>): string {
  const raw = String(read(system, "TipoDiseño", "MetodoCaptura", "MetodoCotizacion", "MétodoCotización", "Diseño")).toLowerCase();
  if (raw.includes("pieza")) return "ListaPiezas";
  if (raw.includes("pedido") || raw.includes("cotización anterior") || raw.includes("cotizacion anterior")) return "PedidoAnterior";
  if (raw.includes("plano") || raw.includes("cliente")) return "Planos";
  return "Diseño";
}

function methodLabel(system: Record<string, unknown>): string {
  const method = normalizeMethod(system);
  if (method === "ListaPiezas") return "Listado de piezas";
  if (method === "PedidoAnterior") return "Cotización o pedido anterior";
  if (method === "Planos") return "Planos/diseño de cliente";
  return "Diseño";
}

function acabadoValue(system: Record<string, unknown>): string {
  const raw = String(read(system, "Acabado", "TipoGalv", "")).trim();
  if (raw) {
    const lower = raw.toLowerCase();
    if (lower === "frio" || lower === "frío" || lower === "galvanizado en frio" || lower === "galvanizado en frío") return "Galvanizado en frío";
    if (lower === "caliente" || lower === "hot-dip" || lower === "hot dip" || lower === "galvanizado en caliente") return "Galvanizado en caliente";
    if (lower === "pregalvanizado" || lower === "pre-galvanizado") return "Pregalvanizado";
    if (lower === "pintado") return "Pintado";
    return raw;
  }
  if (coerceBoolean(read(system, "GalvList", "Galvanizado", false))) return "Galvanizado";
  return "Pintado";
}

function galvanizadoFromAcabado(acabado: string): boolean {
  return acabado.toLowerCase().includes("galv") && acabado.toLowerCase() !== "pintado";
}

function tipoGalvanizadoFromAcabado(acabado: string): string {
  const lower = acabado.toLowerCase();
  if (lower.includes("fr")) return "Frio";
  if (lower.includes("caliente") || lower.includes("hot")) return "Caliente";
  if (lower.includes("pregalv")) return "Pregalvanizado";
  return "";
}

function rowsFromSummary(rows: Record<string, unknown>[], summary: unknown): Record<string, unknown>[] {
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

function htmlToText(value: unknown): string {
  const html = String(value || "");
  if (!html) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]\s*>/gi, " | ")
    .replace(/<\/tr\s*>/gi, "\n")
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
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s*\|\s*$/, ""))
    .filter((line) => line !== "")
    .join("\n")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord);
}

function safeSheetName(name: string): string {
  return name.replace(/[\[\]:*?/\\]/g, "_").substring(0, 31);
}

function tryGetWorksheet(workbook: ExcelScript.Workbook, name: string): ExcelScript.Worksheet | undefined {
  try {
    return workbook.getWorksheet(name);
  } catch {
    return undefined;
  }
}

function getUsedRowCount(sheet: ExcelScript.Worksheet): number {
  const usedRange = sheet.getUsedRange();
  if (!usedRange) return 1;
  return usedRange.getRowIndex() + usedRange.getRowCount();
}

function hasAnyValue(obj: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => obj[key] !== undefined && obj[key] !== null && obj[key] !== "");
}

function coerceBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "sí" || normalized === "si" || normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
}
