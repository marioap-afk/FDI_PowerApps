from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DETAIL_SOURCES = [
    ("SEL", ("Sistema Selectivo", "Sistema selectivo", "sistemaSelectivo", "sistemaSelectivoNormalizado")),
    ("DIN", ("Sistema Dinámico", "Sistema Dinamico", "sistemaDinamico")),
    ("PBK", ("Sistema Pushback", "sistemaPushback")),
    ("DRV", ("Sistema Drive In", "Sistema DriveIn", "sistemaDriveIn")),
    ("CAN", ("Sistema Cantiliver", "Sistema Cantiléver", "Sistema Cantilever", "sistemaCantiliver", "sistemaCantilever")),
    ("MEZ", ("Sistema Mezzanine", "sistemaMezzanine")),
    ("CFL", ("Sistema Carton Flow", "Sistema Cartón Flow", "sistemaCartonFlow")),
    ("MZL", ("Sistema Mezzanine Limpio", "sistemaMezzanineLimpio")),
    ("OT", ("Sistema Otro", "sistemaOtro")),
]

CHILD_SOURCES = [
    ("piezas", "Piezas", ("Hija Listado Piezas", "hijaListadoPiezas")),
    ("tarimas", "Tarimas", ("Hija Tarimas", "hijaTarimas")),
    ("productos", "Productos", ("Hija Productos", "hijaProductos")),
    ("colores", "Colores", ("Hija Colores", "hijaColores")),
    ("elementosSeguridad", "ElementosSeguridad", ("Hija Elementos Seguridad", "hijaElementosSeguridad")),
    ("piezasEspeciales", "PiezasEspeciales", ("Hija Piezas Especiales", "hijaPiezasEspeciales")),
    ("proveedoresExternos", "ProveedoresExternos", ("Hija Proveedores Externos", "hijaProveedoresExternos")),
]

SYSTEM_LOOKUP_KEYS = (
    "SistemaCotizaciónID",
    "SistemaCotizacionID",
    "SistemaCotizaciónIDId",
    "SistemaCotizacionIDId",
    "SistemaCotizaciónID/Id",
    "SistemaCotizacionID/Id",
    "SistemasID",
    "SistemasIDId",
    "SistemasID/Id",
    "SistemaID",
    "SistemaIDId",
    "SistemaID/Id",
)


def pick(data: dict[str, Any], *keys: str, default: Any = "") -> Any:
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return default


def choice_value(value: Any) -> Any:
    if isinstance(value, dict):
        return pick(value, "Value", "value", "Title", "DisplayName", "Name", "Email")
    return value


def as_records(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict) and isinstance(value.get("value"), list):
        value = value["value"]
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def records_for(records: dict[str, Any], *names: str) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    for name in names:
        found.extend(as_records(records.get(name)))
    return found


def lookup_id(value: Any) -> Any:
    if isinstance(value, dict):
        return pick(value, "Id", "ID", "id", "Value", "value")
    return value


def system_lookup_id(record: dict[str, Any]) -> Any:
    for key in SYSTEM_LOOKUP_KEYS:
        value = pick(record, key)
        if value not in (None, ""):
            return lookup_id(value)
    return ""


def as_sort_number(value: Any, default: int = 999999) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_payload_json(record: dict[str, Any]) -> dict[str, Any]:
    raw = pick(record, "PayloadSistemaJson")
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def build_bridge_index(records: dict[str, Any]) -> dict[str, dict[str, Any]]:
    bridges = records_for(records, "Sistemas por cotización", "Sistemas por cotizacion", "sistemasPorCotizacion", "sistemasPuente")
    return {str(pick(record, "ID")): record for record in bridges if pick(record, "ID") not in (None, "")}


def build_child_index(records: dict[str, Any]) -> dict[str, dict[str, list[dict[str, Any]]]]:
    result: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for lower_key, _upper_key, aliases in CHILD_SOURCES:
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in records_for(records, *aliases):
            bridge_id = system_lookup_id(row)
            if bridge_id in (None, ""):
                continue
            grouped.setdefault(str(bridge_id), []).append(row)
        result[lower_key] = grouped
    return result


def normalize_system(record: dict[str, Any], tipo: str, bridges_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    system = parse_payload_json(record)
    for key, value in record.items():
        if key != "PayloadSistemaJson" and value not in (None, ""):
            system.setdefault(key, value)

    bridge_id = system_lookup_id(record)
    bridge = bridges_by_id.get(str(bridge_id), {}) if bridge_id not in (None, "") else {}
    sistema_id = pick(bridge, "SistemaID", "SistemaId", default=pick(system, "SistemaId", "SistemaID", "RegistroID", default=pick(record, "ID")))
    nombre = pick(
        system,
        "NombreSistema",
        "TipoNombre",
        "Title",
        default=pick(bridge, "NombreSistema", "Nombre", "Title", default=pick(record, "Title")),
    )

    system["Tipo"] = tipo
    system["TipoKey"] = tipo
    system["RegistroID"] = pick(record, "ID")
    system["SistemaCotizaciónID"] = bridge_id
    system["SistemaCotizacionID"] = bridge_id
    system["SistemaId"] = lookup_id(sistema_id)
    system["NombreSistema"] = nombre
    system["Folio"] = pick(system, "Folio", default=pick(bridge, "Folio", default=pick(record, "Folio")))

    if tipo == "OT":
        system["HTMLCol"] = pick(system, "HTMLCol", "HTML", default=pick(record, "HTML"))

    return system


def append_children(system: dict[str, Any], child_index: dict[str, dict[str, list[dict[str, Any]]]]) -> None:
    bridge_id = pick(system, "SistemaCotizaciónID", "SistemaCotizacionID")
    if bridge_id in (None, ""):
        return
    for lower_key, upper_key, _aliases in CHILD_SOURCES:
        rows = child_index.get(lower_key, {}).get(str(bridge_id), [])
        system[lower_key] = rows
        system[upper_key] = rows


def build_systems(records: dict[str, Any]) -> list[dict[str, Any]]:
    bridges_by_id = build_bridge_index(records)
    child_index = build_child_index(records)
    systems_by_key: dict[tuple[str, str], dict[str, Any]] = {}

    for tipo, aliases in DETAIL_SOURCES:
        for record in records_for(records, *aliases):
            system = normalize_system(record, tipo, bridges_by_id)
            bridge_id = pick(system, "SistemaCotizaciónID", "SistemaCotizacionID")
            dedupe_id = str(bridge_id or pick(system, "RegistroID"))
            key = (tipo, dedupe_id)
            if key in systems_by_key:
                continue
            append_children(system, child_index)
            systems_by_key[key] = system

    systems = list(systems_by_key.values())
    systems.sort(key=lambda item: (as_sort_number(pick(item, "SistemaId", "SistemaID")), as_sort_number(pick(item, "RegistroID"))))
    return systems


def build_payload(records: dict[str, Any]) -> dict[str, Any]:
    cotizacion = records.get("cotizacion", {})

    payload = {
        "cotizacion": {
            "Creación": pick(cotizacion, "Created"),
            "ID": pick(cotizacion, "ID"),
            "Carpeta": pick(cotizacion, "Carpeta"),
            "Folio": pick(cotizacion, "Folio"),
            "VendedoresLookUp": choice_value(pick(cotizacion, "VendedoresLookUp")),
            "EmpresaLookUp": choice_value(pick(cotizacion, "EmpresaLookUp")),
            "Dirección de la empresa": pick(cotizacion, "Direcci_x00f3_ndelaempresa", "Dirección de la empresa"),
            "ContactoLookUp": choice_value(pick(cotizacion, "ContactoLookUp")),
            "Correo empresarial": pick(cotizacion, "Correoempresarial", "Correo empresarial"),
            "Número de teléfono": pick(cotizacion, "N_x00fa_merodetel_x00e9_fono", "Número de teléfono"),
            "Moneda de cotización": choice_value(pick(cotizacion, "Monedadecotizaci_x00f3_n")),
            "Flete": pick(cotizacion, "Flete"),
            "País de destino": choice_value(pick(cotizacion, "Pa_x00ed_sdedestino")),
            "Estado de destino": choice_value(pick(cotizacion, "Estadodedestino")),
            "Ciudad de destino": choice_value(pick(cotizacion, "Ciudaddedestino")),
            "Fianzas": pick(cotizacion, "Fianzas"),
            "Póliza de responsabilidad civil": pick(cotizacion, "P_x00f3_lizaderesponsabilidadciv"),
            "Monto de póliza": pick(cotizacion, "Montodep_x00f3_liza"),
            "Licitación": pick(cotizacion, "Licitaci_x00f3_n"),
            "Fecha de entrega": pick(cotizacion, "Fechadeentrega"),
            "Prioridad": choice_value(pick(cotizacion, "Prioridad")),
            "Estado": choice_value(pick(cotizacion, "Estado")),
            "Created By": choice_value(pick(cotizacion, "Author")),
            "Notificado": pick(cotizacion, "Notificado"),
            "Title": pick(cotizacion, "Title"),
            "Nombre de contacto": pick(cotizacion, "Nombredecontacto"),
            "Solicitud o generación": choice_value(pick(cotizacion, "Solicitudogeneraci_x00f3_n")),
            "Item Type": choice_value(pick(cotizacion, "{ContentType}")),
            "Path": pick(cotizacion, "{Path}"),
        },
        "sistemas": [],
    }

    payload["sistemas"] = build_systems(records)
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Arma el payload global FDI desde registros SharePoint exportados.")
    parser.add_argument("--input", default="examples/fdi-sharepoint-records.sample.json", type=Path)
    parser.add_argument("--output", default="work/fdi_closure_20260609_02/payload-global-from-records.json", type=Path)
    args = parser.parse_args()

    records = json.loads(args.input.read_text(encoding="utf-8"))
    payload = build_payload(records)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
