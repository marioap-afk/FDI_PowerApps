from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def pick(data: dict[str, Any], *keys: str, default: Any = "") -> Any:
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return default


def choice_value(value: Any) -> Any:
    if isinstance(value, dict):
        return pick(value, "Value", "value", "Title", "DisplayName", "Name")
    return value


def parse_sel_payload(record: dict[str, Any]) -> dict[str, Any]:
    raw = pick(record, "Lista_x0020_de_x0020_piezas", "Lista de piezas", default="{}")
    parsed = json.loads(raw or "{}")
    if not isinstance(parsed, dict):
        parsed = {}

    parsed["Tipo"] = "SEL"
    parsed["TipoKey"] = "SEL"
    parsed["RegistroID"] = pick(record, "ID")
    parsed["NombreSistema"] = pick(parsed, "NombreSistema", default=pick(record, "Title"))
    parsed["Folio"] = pick(record, "Folio")
    return parsed


def build_payload(records: dict[str, Any]) -> dict[str, Any]:
    cotizacion = records.get("cotizacion", {})
    sel_records = records.get("sistemaSelectivo", [])
    ot_records = records.get("sistemaOtro", [])

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

    for record in sel_records:
        payload["sistemas"].append(parse_sel_payload(record))

    for record in ot_records:
        payload["sistemas"].append(
            {
                "Tipo": "OT",
                "TipoKey": "OT",
                "RegistroID": pick(record, "ID"),
                "SistemaId": pick(record, "SistemaID", default=pick(record, "ID")),
                "NombreSistema": pick(record, "Title"),
                "Folio": pick(record, "Folio"),
                "HTMLCol": pick(record, "HTML"),
            }
        )

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
