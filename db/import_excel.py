"""One-shot import of the Vora sales workbook into postgres. Re-run safe: truncates first.
usage: python -I db/import_excel.py "21-09 DYD.xlsx"
"""
import re
import sys
import openpyxl
import psycopg

YEAR = 2026  # ponytail: sheets only carry dd-mm; year assumed from the workbook's date range
SKIP = re.compile(r"^(hoja|acumula|nuevo acumula|faltan|fardo|c[óo]digos|ventas personalizadas|paquetes|desde ac[áa] empaquetar|gin\b|gg$)", re.I)
HDR = re.compile(r"^\W*(cod|c[óo]digo|codigo)", re.I)
COLOR = {  # first-cell fill -> estado, from the "Códigos de Color" sheet
    "FF00FF00": "pagada", "FFFF9900": "esperando_pago", "FFFF0000": "no_habla",
    "FFF877B8": "no_se_encuentra", "FFFFFF00": "empaquetada",
}
RETIRO, BLUE, STARKEN = "retiro_tienda", "bluex", "starken"


def phone(v):
    d = re.sub(r"\D", "", str(v)) if v is not None else ""
    if len(d) == 9 and d[0] == "9":
        d = "56" + d
    return d if len(d) == 11 and d.startswith("569") else None


def courier(s):
    s = s.lower()
    if "blue" in s:
        return BLUE
    if "stark" in s:
        return STARKEN
    if "retiro" in s or "tienda" in s:
        return RETIRO
    return None


def header_map(row):
    m = {}
    for i, v in enumerate(row):
        t = str(v or "").lower().strip()
        for key, pat in (("talla", "talla"), ("material", "material"), ("tel", "tel"), ("ag", "agencia|^a\\W*$"),
                         ("det", "detalle"), ("b2", "2d|2a|segundo"), ("b3", "3er|3ro|tercer"),
                         ("b1", "1er|1 comp|^nombre|primer|comprador"), ("monto", "monto|valor|\\$")):
            if key not in m and re.search(pat, t):
                m[key] = i
                break
    return m


def parse_live(name):
    m = re.match(r"\s*(\d{1,2})\s*-?\s*(\d{2})", name)
    if m and 1 <= int(m[2]) <= 12 and 1 <= int(m[1]) <= 31:
        return f"{YEAR}-{int(m[2]):02d}-{int(m[1]):02d}"
    return None


def rows_of(ws):
    hmap = None
    for row in ws.iter_rows():
        vals = [c.value for c in row]
        if vals and isinstance(vals[0], str) and HDR.match(vals[0]):
            hmap = header_map(vals)
            continue
        code = vals[0] if vals else None
        if isinstance(code, str) and code.strip().isdigit():
            code = int(code)
        if not isinstance(code, (int, float)) or not 0 <= code <= 9999 or code != int(code):
            continue
        fill = row[0].fill.fgColor.rgb if row[0].fill.fill_type and row[0].fill.fgColor.type == "rgb" else None
        theme = row[0].fill.fgColor.theme if row[0].fill.fill_type and row[0].fill.fgColor.type == "theme" else None
        yield int(code), vals, hmap, COLOR.get(fill, "liberada" if theme == 4 else "reservada")


def extract(vals, hmap):
    s = lambda i: str(vals[i]).strip() if i is not None and i < len(vals) and vals[i] not in (None, "") else None
    if hmap and "b1" in hmap:
        monto = vals[hmap["monto"]] if "monto" in hmap and isinstance(vals[hmap.get("monto")], (int, float)) else None
        buyers = [s(hmap.get(k)) for k in ("b1", "b2", "b3")]
        ph, ag, det = s(hmap.get("tel")), s(hmap.get("ag")), s(hmap.get("det"))
        return monto, [b for b in buyers if b], phone(ph), courier(ag or ""), det, s(hmap.get("talla")), s(hmap.get("material"))
    # headerless/old layout: cod, monto, buyers..., phone, agency, notes
    monto = vals[1] if len(vals) > 1 and isinstance(vals[1], (int, float)) else None
    buyers, ph, cr, det = [], None, None, []
    for v in vals[2:]:
        if v in (None, ""):
            continue
        if phone(v) and not ph:
            ph = phone(v)
        elif isinstance(v, str) and courier(v) and not cr:
            cr = courier(v)
        elif isinstance(v, str) and ph is None and cr is None and len(buyers) < 3:
            buyers.append(v.strip())
        elif isinstance(v, str):
            det.append(v.strip())
    return monto, buyers, ph, cr, " | ".join(det) or None, None, None


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    with psycopg.connect("postgresql://vora:vora@localhost:5433/vora") as conn, conn.cursor() as cur:
        cur.execute("TRUNCATE ventas, reservas_respaldo, clientes, lives RESTART IDENTITY CASCADE")
        by_phone, by_name = {}, {}

        def cliente(name, ph):
            if not name:
                return None
            key = name.lower()
            cid = by_phone.get(ph) if ph else None
            cid = cid or (by_name.get(key) if not ph else None)
            if cid is None:
                cur.execute("INSERT INTO clientes (nombre, telefono) VALUES (%s,%s) RETURNING id", (name, ph))
                cid = cur.fetchone()[0]
            if ph:
                by_phone[ph] = cid
            by_name.setdefault(key, cid)
            return cid

        n = skipped = 0
        for ws in wb:
            if SKIP.match(ws.title.strip()):
                skipped += 1
                continue
            rows = list(rows_of(ws))
            if not rows:
                skipped += 1
                continue
            cur.execute("INSERT INTO lives (nombre, fecha) VALUES (%s,%s) RETURNING id", (ws.title.strip(), parse_live(ws.title)))
            live = cur.fetchone()[0]
            for code, vals, hmap, estado in rows:
                monto, buyers, ph, cr, det, talla, mat = extract(vals, hmap)
                cid = cliente(buyers[0], ph) if buyers else None
                cur.execute(
                    "INSERT INTO ventas (live_id,codigo,monto,talla,material,cliente_id,comprador_texto,estado,courier,detalle)"
                    " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                    (live, code, int(monto) if monto is not None else None, talla, mat, cid,
                     buyers[0] if buyers else None, estado, cr, det))
                vid = cur.fetchone()[0]
                for orden, b in enumerate(buyers[1:3], start=2):
                    cur.execute("INSERT INTO reservas_respaldo VALUES (%s,%s,%s,%s)", (vid, orden, b, cliente(b, None)))
                n += 1
        print(f"ventas={n} sheets_skipped={skipped}")


main(sys.argv[1])
