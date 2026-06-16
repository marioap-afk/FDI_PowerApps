#!/usr/bin/env python3
"""FDI .msapp integrity validator.

Verifica que un .msapp sea CANÓNICO y CONSISTENTE antes de empaquetar/desplegar.
Pensado para correr SIEMPRE: atrapa los .msapp producidos por round-trip YAML que
dejan `Controls/` (lo compilado/runtime) desincronizado respecto a `Src/` (la fuente).

Uso:
    python3 validate_msapp.py [ruta/al/.msapp]   (default: el .msapp del repo FDI)

Salida: PASS/FAIL por chequeo. Exit code != 0 si hay algún FAIL (bloqueante).
Los WARN no bloquean pero se reportan.
"""
import io, os, re, sys, json, glob, zipfile, hashlib

REPO = "/workspaces/FDI_PowerApps"
DEFAULT_MSAPP = f"{REPO}/CanvasApps/mapc_fdi_412ec_DocumentUri.msapp"
MOJIBAKE = re.compile(rb'\xc3[\x82\x83]\xc2[\x80-\xbf]')
# El conteo de controles Src("Control:") vs Controls(JSON) tiene un sesgo de método
# estable (~1.7x) incluso en .msapp sanos; por eso el conteo por pantalla es WARN y
# solo a partir de un umbral alto. El chequeo DURO de staleness es el set de pantallas.
COUNT_RATIO_WARN = 3.0

fails, warns = [], []
def ok(msg):   print(f"  PASS  {msg}")
def fail(msg): print(f"  FAIL  {msg}"); fails.append(msg)
def warn(msg): print(f"  WARN  {msg}"); warns.append(msg)

def load(msapp_path):
    raw = open(msapp_path, "rb").read()
    return raw, zipfile.ZipFile(io.BytesIO(raw))

def src_screens(zf):
    """{nombre_pantalla: nº de 'Control:' } desde Src/*.pa.yaml (1 archivo por pantalla)."""
    out = {}
    for n in zf.namelist():
        if n.startswith("Src/") and n.endswith(".pa.yaml"):
            base = os.path.basename(n)[:-len(".pa.yaml")]
            if base.startswith("scr"):
                txt = zf.read(n).decode("utf-8", "replace")
                out[base] = len(re.findall(r'(?m)^\s*Control: ', txt))
    return out

def controls_screens(zf):
    """{nombre_pantalla: nº de instancias de control} desde Controls/*.json (TopParent=screen)."""
    out = {}
    for n in zf.namelist():
        if n.startswith("Controls/") and n.endswith(".json"):
            try: d = json.loads(zf.read(n))
            except Exception: continue
            tp = d.get("TopParent", {}) if isinstance(d, dict) else {}
            if (tp.get("Template") or {}).get("Name") == "screen":
                cnt = [0]
                def w(node):
                    if isinstance(node, dict):
                        # una instancia de control tiene Name + Template(dict) + Rules
                        if isinstance(node.get("Template"), dict) and "Name" in node and "Rules" in node:
                            cnt[0] += 1
                        for v in node.values(): w(v)
                    elif isinstance(node, list):
                        for v in node: w(v)
                w(tp)
                out[tp.get("Name")] = cnt[0]
    return out

def main():
    msapp = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MSAPP
    print("="*64); print(f"FDI .msapp integrity — {os.path.basename(msapp)}"); print("="*64)
    raw, zf = load(msapp)
    names = zf.namelist()

    # --- 1) Todos los JSON internos parsean + Header coherente ---
    print("\n[1] Estructura interna")
    bad = []
    for n in names:
        if n.lower().endswith(".json"):
            try: json.loads(zf.read(n))
            except Exception as e: bad.append(f"{n}: {e}")
    (ok if not bad else fail)(f"{sum(n.lower().endswith('.json') for n in names)} json internos parsean" if not bad else f"json inválidos: {bad[:2]}")
    hdr = json.loads(zf.read("Header.json")) if "Header.json" in names else {}
    (ok if hdr.get("DocVersion") and hdr.get("MSAppStructureVersion") else fail)(
        f"Header DocVersion={hdr.get('DocVersion')} StructVer={hdr.get('MSAppStructureVersion')}")

    # --- 2) CRÍTICO: Src/ ↔ Controls/ consistentes (mismo set de pantallas) ---
    print("\n[2] Consistencia Src/ ↔ Controls/  (lo que atrapa el round-trip YAML)")
    s, c = src_screens(zf), controls_screens(zf)
    s_only = sorted(set(s) - set(c)); c_only = sorted(set(c) - set(s))
    if not s_only and not c_only:
        ok(f"mismas {len(s)} pantallas en Src/ y Controls/")
    else:
        if s_only: fail(f"pantallas en Src/ pero NO compiladas en Controls/: {s_only}")
        if c_only: fail(f"pantallas en Controls/ que ya no están en Src/: {c_only}")

    # --- 3) por pantalla común, conteo de controles muy divergente → Controls stale (WARN) ---
    count_flagged = False
    for name in sorted(set(s) & set(c)):
        a, b = s[name], c[name]
        hi, lo = max(a, b), max(1, min(a, b))
        if hi / lo > COUNT_RATIO_WARN:
            warn(f"'{name}': Src={a} vs Controls={b} controles (ratio {hi/lo:.1f}x) → probable Controls/ stale"); count_flagged = True
    if not count_flagged:
        ok(f"conteo de controles por pantalla sin divergencias gruesas ({len(set(s)&set(c))} comunes, < {COUNT_RATIO_WARN}x)")

    # --- 4) Mojibake ---
    print("\n[4] Mojibake / encoding")
    (ok if not MOJIBAKE.findall(raw) else fail)("0 coincidencias de mojibake en el .msapp"
        if not MOJIBAKE.findall(raw) else f"{len(MOJIBAKE.findall(raw))} coincidencias de mojibake")

    # --- 5) Registro de templates (used ⊆ registrados; PCF/first-party exentos) ---
    print("\n[5] Registro de templates")
    tmpl = json.loads(zf.read("References/Templates.json"))
    reg = set()
    for k in ("UsedTemplates", "ComponentTemplates", "PcfTemplates"):
        for e in tmpl.get(k, []):
            if isinstance(e, dict) and e.get("Name"): reg.add(e["Name"])
    used = {}
    def walk(node):
        if isinstance(node, dict):
            t = node.get("Template")
            if isinstance(t, dict) and t.get("Name"):
                ex = bool(t.get("FirstParty") or t.get("DynamicControlDefinitionJson")
                          or t.get("IsComponentDefinition") or t.get("IsPcfControl") or t.get("CustomControl"))
                used[t["Name"]] = used.get(t["Name"], False) or ex
            for v in node.values(): walk(v)
        elif isinstance(node, list):
            for v in node: walk(v)
    for n in names:
        if (n.startswith("Controls/") or n.startswith("Components/")) and n.endswith(".json"):
            walk(json.loads(zf.read(n)))
    miss = sorted(k for k, e in used.items() if k not in reg and not e)
    (ok if not miss else fail)(f"{len(used)} templates usados, todos registrados (PCF/first-party exentos)"
        if not miss else f"templates usados sin registrar: {miss}")

    # --- 6) Frescura: AppVersion congelado entre .msapp distintos = 'no guardado por Studio' ---
    print("\n[6] Frescura (AppVersion única por binario)")
    last_save = hdr.get("LastSavedDateTimeUTC")
    cur_sha = hashlib.sha256(raw).hexdigest()
    cur_cust = f"{REPO}/Other/Customizations.xml"
    cur_av = None
    if os.path.exists(cur_cust):
        m = re.search(r"<AppVersion>([^<]+)</AppVersion>", open(cur_cust, encoding="utf-8", errors="replace").read())
        cur_av = m.group(1) if m else None
    # Mapear AppVersion -> {sha de .msapp} sobre los últimos paquetes + el actual
    av_to_sha = {}
    for z in sorted(glob.glob(f"{REPO}/solutions/FDI_unmanaged_*_*.zip"))[-10:]:
        try:
            pz = zipfile.ZipFile(z)
            sha = hashlib.sha256(pz.read("CanvasApps/mapc_fdi_412ec_DocumentUri.msapp")).hexdigest()
            av = re.search(r"<AppVersion>([^<]+)</AppVersion>", pz.read("customizations.xml").decode("utf-8", "replace"))
            if av: av_to_sha.setdefault(av.group(1), set()).add(sha)
        except Exception: pass
    if cur_av: av_to_sha.setdefault(cur_av, set()).add(cur_sha)
    if cur_av and len(av_to_sha.get(cur_av, set())) > 1:
        warn(f"AppVersion {cur_av} corresponde a {len(av_to_sha[cur_av])} .msapp DISTINTOS → no se está bumpeando/guardando por Studio")
    else:
        ok(f"AppVersion={cur_av} | LastSaved={last_save}")

    # --- resumen ---
    print("\n" + "="*64)
    if fails:
        print(f"❌ INTEGRIDAD: {len(fails)} FAIL, {len(warns)} WARN")
        for f in fails: print("  FAIL -", f)
        sys.exit(1)
    print(f"✅ INTEGRIDAD OK ({len(warns)} WARN)")
    for w in warns: print("  WARN -", w)
    sys.exit(0)

if __name__ == "__main__":
    main()
