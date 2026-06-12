from __future__ import annotations

import argparse
import json
from copy import copy
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter


HEADER_ROWS = {
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
    "Path": 30,
}


def truthy(value: Any) -> str:
    if isinstance(value, bool):
        return "Sí" if value else "No"
    if value is None:
        return ""
    return str(value)


def pick(data: dict[str, Any], *keys: str, default: Any = "") -> Any:
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return default


def normalize_method(system: dict[str, Any]) -> str:
    raw = str(pick(system, "TipoDiseño", "MetodoCotizacion", "MétodoCotización", default="Diseño")).strip().lower()
    if "pieza" in raw:
        return "ListaPiezas"
    if "pedido" in raw:
        return "PedidoAnterior"
    return "Diseño"


def safe_sheet_name(name: str) -> str:
    cleaned = "".join("_" if ch in r'[]:*?/\\' else ch for ch in name)
    return cleaned[:31]


def clear_range(ws, min_row: int, max_row: int, min_col: int, max_col: int) -> None:
    for row in ws.iter_rows(min_row=min_row, max_row=max_row, min_col=min_col, max_col=max_col):
        for cell in row:
            cell.value = None


def set_cell(ws, address: str, value: Any) -> None:
    """Write to a cell, resolving merged ranges to their editable top-left cell."""
    target = ws[address]
    if target.__class__.__name__ == "MergedCell":
        for merged_range in ws.merged_cells.ranges:
            if address in merged_range:
                target = ws.cell(merged_range.min_row, merged_range.min_col)
                break
    target.value = value


def copy_row_style(ws, source_row: int, target_row: int, min_col: int, max_col: int) -> None:
    for col in range(min_col, max_col + 1):
        source = ws.cell(source_row, col)
        target = ws.cell(target_row, col)
        if source.has_style:
            target._style = copy(source._style)
        target.font = copy(source.font)
        target.fill = copy(source.fill)
        target.border = copy(source.border)
        target.alignment = copy(source.alignment)
        target.number_format = source.number_format
        target.protection = copy(source.protection)


def fill_header(wb, cotizacion: dict[str, Any]) -> None:
    ws = wb["Encabezado_Tabla"]
    for key, row in HEADER_ROWS.items():
        ws.cell(row, 3).value = truthy(cotizacion.get(key, ""))


def fill_sistemas_index(wb, systems: list[dict[str, Any]], sheet_names: dict[int, str]) -> None:
    ws = wb["Sistemas_Index"]
    clear_range(ws, 4, max(ws.max_row, 92), 1, 9)
    for index, system in enumerate(systems, 1):
        row = index + 3
        copy_row_style(ws, 4, row, 1, 9)
        system_id = pick(system, "SistemaId", "SistemaID", default=index)
        tipo = pick(system, "TipoKey", "Tipo", default="SEL")
        ws.cell(row, 1).value = f"{tipo}-{index:04d}"
        ws.cell(row, 2).value = index
        ws.cell(row, 3).value = tipo
        ws.cell(row, 4).value = normalize_method(system)
        ws.cell(row, 5).value = sheet_names.get(index, "")
        ws.cell(row, 6).value = pick(system, "NombreSistema", "TipoNombre", default=f"Sistema {index}")
        ws.cell(row, 7).value = pick(system, "NumPedidoCot", "PedidoBase")
        ws.cell(row, 8).value = pick(system, "DiseñoRef", "DisenoRef")
        ws.cell(row, 9).value = pick(system, "ConsEsp", "HTMLCol")
    if "tblSistemas" in ws.tables:
        last_row = max(4, len(systems) + 3)
        ws.tables["tblSistemas"].ref = f"A3:I{last_row}"


def fill_sel_form(ws, system: dict[str, Any], system_no: int) -> None:
    set_cell(ws, "B3", system_no)
    set_cell(ws, "B9", pick(system, "NumPedidoCot", "PedidoBase"))
    set_cell(ws, "B10", pick(system, "ConsEsp"))

    piezas = system.get("piezas") or system.get("Piezas") or []
    for offset, pieza in enumerate(piezas[:10], 15):
        ws.cell(offset, 1).value = pick(pieza, "Pieza", "Código", "Codigo")
        ws.cell(offset, 2).value = pick(pieza, "Comentarios", "Comentario", "Descripción", "Descripcion")
        ws.cell(offset, 3).value = pick(pieza, "Cantidad")
        ws.cell(offset, 4).value = pick(pieza, "Unidad")
        ws.cell(offset, 5).value = pick(pieza, "Notas")

    tarimas = system.get("tarimas") or system.get("Tarimas") or []
    first_tarima = tarimas[0] if tarimas else {}
    set_cell(ws, "B28", pick(first_tarima, "Tipo"))
    set_cell(ws, "B30", pick(first_tarima, "Alto"))
    set_cell(ws, "B31", pick(first_tarima, "Frente"))
    set_cell(ws, "B32", pick(first_tarima, "Fondo"))
    set_cell(ws, "B33", pick(first_tarima, "ExcedenteFrente"))
    set_cell(ws, "B34", pick(first_tarima, "ExcedenteFondo"))

    set_cell(ws, "B39", pick(system, "PasilloMin"))
    set_cell(ws, "B40", pick(system, "PasilloMax"))
    set_cell(ws, "B41", pick(system, "AnchoDisp"))
    set_cell(ws, "B42", pick(system, "LargoDisp"))
    set_cell(ws, "B46", pick(system, "ConfNiv", "ConfiguracionNiveles"))
    set_cell(ws, "B47", pick(system, "AltCritMonta"))
    set_cell(ws, "B48", pick(system, "AltCritNiv"))
    set_cell(ws, "B51", pick(system, "DefPorCliente"))
    set_cell(ws, "B53", truthy(pick(system, "GalvList", "Galvanizado")))
    set_cell(ws, "B54", pick(system, "TipoGalv"))
    set_cell(ws, "B55", pick(system, "PpkgGalv"))
    colores = system.get("colores") or system.get("Colores") or []
    set_cell(ws, "B56", "; ".join(
        f"{pick(color, 'Pieza')}: {pick(color, 'Color')}".strip(": ")
        for color in colores
        if pick(color, "Pieza", "Color")
    ))
    set_cell(ws, "B57", truthy(pick(system, "Ins", "Instalacion")))
    set_cell(ws, "B58", truthy(pick(system, "MemCalc")))
    set_cell(ws, "B59", truthy(pick(system, "EstProv")))
    set_cell(ws, "B60", truthy(pick(system, "ProvExternos")))
    set_cell(ws, "B61", pick(system, "ConsEsp"))


def add_detail_sheet(wb, system: dict[str, Any], sheet_name: str) -> None:
    ws = wb.create_sheet(safe_sheet_name(sheet_name.replace("_Form", "_Datos")))
    ws["A1"] = "Detalle estructurado del sistema"
    ws["A2"] = pick(system, "NombreSistema", default=sheet_name)
    sections = [
        ("Piezas", ["Pieza", "Comentarios", "Cantidad", "Unidad", "Notas"], system.get("piezas") or system.get("Piezas") or []),
        ("Tarimas", ["Tipo", "Alto", "Frente", "Fondo", "ExcedenteFrente", "ExcedenteFondo"], system.get("tarimas") or system.get("Tarimas") or []),
        ("Elementos de seguridad", ["Pieza", "Comentario"], system.get("elementosSeguridad") or system.get("ElementosSeguridad") or []),
        ("Colores", ["Pieza", "Color"], system.get("colores") or system.get("Colores") or []),
    ]
    row = 4
    for title, headers, rows in sections:
        ws.cell(row, 1).value = title
        row += 1
        for col, header in enumerate(headers, 1):
            ws.cell(row, col).value = header
        for item in rows:
            row += 1
            for col, header in enumerate(headers, 1):
                ws.cell(row, col).value = truthy(item.get(header, ""))
        row += 2
    for col in range(1, 9):
        ws.column_dimensions[get_column_letter(col)].width = 24


def add_ot_sheet(wb, system: dict[str, Any], sheet_name: str, system_no: int) -> None:
    ws = wb.create_sheet(safe_sheet_name(sheet_name))
    ws["A1"] = "Formulario de Sistema (Otro)"
    ws["A3"] = "Sistema No"
    ws["B3"] = system_no
    ws["A4"] = "SistemaID"
    ws["B4"] = pick(system, "SistemaId", "SistemaID")
    ws["A5"] = "Descripción"
    ws["B5"] = pick(system, "NombreSistema")
    ws["A7"] = "Detalle HTML"
    ws["B7"] = pick(system, "HTMLCol")
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 80


def add_payload_sheet(wb, payload: dict[str, Any]) -> None:
    ws = wb.create_sheet("FDI_Payload_JSON")
    ws.sheet_state = "hidden"
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    ws["A1"] = "Payload JSON usado para generar este archivo"
    chunk_size = 30000
    for index in range(0, len(text), chunk_size):
        ws.cell(index // chunk_size + 2, 1).value = text[index:index + chunk_size]


def generate(template: Path, payload_path: Path, output: Path) -> None:
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    cotizacion = payload.get("cotizacion", {})
    systems = payload.get("sistemas", [])

    wb = load_workbook(template)
    fill_header(wb, cotizacion)

    sheet_names: dict[int, str] = {}
    sel_template = wb["SEL_S01_Form"]
    sel_to_fill: list[tuple[Any, dict[str, Any], int]] = []
    sel_count = 0
    for index, system in enumerate(systems, 1):
        tipo = str(pick(system, "TipoKey", "Tipo", default="SEL")).upper()
        if tipo == "SEL":
            sel_count += 1
            sheet_name = safe_sheet_name(f"SEL_S{index:02d}_Form")
            if sel_count == 1:
                ws = sel_template
                ws.title = sheet_name
            else:
                ws = wb.copy_worksheet(sel_template)
                ws.title = sheet_name
            sheet_names[index] = sheet_name
            sel_to_fill.append((ws, system, index))
        else:
            sheet_name = safe_sheet_name(f"{tipo}_S{index:02d}_Form")
            sheet_names[index] = sheet_name
            add_ot_sheet(wb, system, sheet_name, index)

    fill_sistemas_index(wb, systems, sheet_names)
    for ws, system, index in sel_to_fill:
        fill_sel_form(ws, system, index)
        add_detail_sheet(wb, system, ws.title)
    add_payload_sheet(wb, payload)

    output.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera una copia FDI XLSX desde la plantilla y un payload JSON.")
    parser.add_argument("--template", default="templates/FDI_Master.xlsx", type=Path)
    parser.add_argument("--payload", default="examples/fdi-payload.sample.json", type=Path)
    parser.add_argument("--output", default="work/fdi_closure_20260609_01/output/FDI_TEST_001-26.xlsx", type=Path)
    args = parser.parse_args()
    generate(args.template, args.payload, args.output)
    print(args.output)


if __name__ == "__main__":
    main()
