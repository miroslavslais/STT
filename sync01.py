#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync.py — synchronizace exportu z Claude Design do repozitáře STT

Použití:
    python sync.py export.zip                # normální běh
    python sync.py export.zip --dry-run      # jen ukáže, co by udělal
    python sync.py export.zip --baseline     # PRVNÍ běh: založí manifest bez badgů
    python sync.py export/ --repo ../STT     # zdroj i cíl lze určit ručně

Co dělá:
    1. Rozbalí ZIP (nebo použije složku) a najde kořen exportu.
    2. Spočítá hash normalizovaného obsahu každé HTML stránky.
    3. Načte changelog ze skrytého bloku v novinky.html.
    4. Porovná s manifestem pages.json a rozhodne: nová / změněná / beze změny.
    5. Zkopíruje jen to, co se skutečně změnilo. Nikdy nic nemaže.
    6. Do nových stránek vloží data-first-seen + JS, který badge po 30 dnech schová.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import tempfile
import unicodedata
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Chybí knihovna beautifulsoup4. Nainstaluj:  pip install beautifulsoup4")


# ──────────────────────────────────────────────────────────────────────
# Konfigurace
# ──────────────────────────────────────────────────────────────────────

MANIFEST_NAME = "pages.json"
BADGE_DAYS = 30

# Stránky, které se kopírují, ale nesledují jako obsah (nedostanou badge,
# nepočítají se do statistiky změn).
UNTRACKED_PAGES = {"404.html", "novinky.html"}

# Soubory a složky, které se do repozitáře nikdy nekopírují.
SKIP_NAMES = {".DS_Store", "Thumbs.db", "__MACOSX"}

MARK_START = "<!-- stt-novinka:start -->"
MARK_END = "<!-- stt-novinka:end -->"

BADGE_SNIPPET = """{start}
<style>
.stt-novinka{{display:inline-block;margin-left:.5em;padding:.15em .55em;
border-radius:999px;font-size:.62em;font-weight:700;letter-spacing:.04em;
text-transform:uppercase;vertical-align:middle;background:#e8590c;color:#fff;
font-family:inherit;line-height:1.6}}
</style>
<script>
(function(){{
  var d = document.body && document.body.dataset.firstSeen;
  if (!d) return;
  var seen = new Date(d + "T00:00:00");
  if (isNaN(seen)) return;
  if (Date.now() - seen.getTime() >= {days} * 864e5) return;
  var run = function(){{
    var h = document.querySelector("h1");
    if (!h || h.querySelector(".stt-novinka")) return;
    var s = document.createElement("span");
    s.className = "stt-novinka";
    s.textContent = "Novinka";
    h.appendChild(s);
  }};
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", run);
  else run();
}})();
</script>
{end}"""


# ──────────────────────────────────────────────────────────────────────
# Pomocné funkce
# ──────────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Název souboru/nadpisu -> slug. Zachovává lomítka jako oddělovače cest."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9/]+", "-", text.lower())
    return re.sub(r"-*/-*", "/", text).strip("-/")


def normalized_hash(html: str) -> str:
    """
    Hash počítaný jen z viditelného obsahu.

    Zahazuje <script>, <style>, komentáře a všechny atributy, takže vložení
    badge ani nedeterministická ID z exportu hash neovlivní. Sleduje se text
    a struktura nadpisů — tedy to, co student skutečně vidí.
    """
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    parts: list[str] = []
    for el in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        parts.append(f"#{el.name}:{' '.join(el.get_text().split())}")
    text = " ".join(soup.get_text(separator=" ").split())
    parts.append(text)

    return hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def page_title(html: str, fallback: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    if h1 and h1.get_text().strip():
        return " ".join(h1.get_text().split())
    if soup.title and soup.title.get_text().strip():
        return " ".join(soup.title.get_text().split())
    return fallback


# ──────────────────────────────────────────────────────────────────────
# Datové struktury
# ──────────────────────────────────────────────────────────────────────

@dataclass
class ChangelogEntry:
    kind: str              # new | edit | rename | delete | layout
    slug: str
    title: str = ""
    desc: str = ""
    new_slug: str = ""     # jen u rename
    day: str = ""


@dataclass
class Report:
    new: list = field(default_factory=list)
    changed: list = field(default_factory=list)
    unchanged: list = field(default_factory=list)
    renamed: list = field(default_factory=list)
    manual: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────
# Krok 1 — příprava zdroje
# ──────────────────────────────────────────────────────────────────────

def prepare_source(src: Path, tmp: Path) -> Path:
    """Rozbalí ZIP (nebo vezme složku) a najde kořen exportu."""
    if src.is_file() and src.suffix.lower() == ".zip":
        with zipfile.ZipFile(src) as zf:
            zf.extractall(tmp)
        root = tmp
    elif src.is_dir():
        root = src
    else:
        sys.exit(f"Zdroj neexistuje nebo to není ZIP ani složka: {src}")

    # Kořen = složka, kde leží site-structure.json (nebo aspoň index.html).
    for marker in ("site-structure.json", "index.html"):
        hits = sorted(root.rglob(marker), key=lambda p: len(p.parts))
        hits = [h for h in hits if "__MACOSX" not in h.parts]
        if hits:
            return hits[0].parent
    sys.exit("V exportu se nepodařilo najít site-structure.json ani index.html.")


# ──────────────────────────────────────────────────────────────────────
# Krok 2 — changelog
# ──────────────────────────────────────────────────────────────────────

def parse_changelog(export_root: Path, report: Report) -> list[ChangelogEntry]:
    """Vytáhne skrytý datový blok z novinky.html a rozparsuje řádky."""
    novinky = export_root / "novinky.html"
    if not novinky.exists():
        report.warnings.append("novinky.html není v exportu — popisky změn nebudou k dispozici.")
        return []

    soup = BeautifulSoup(read_text(novinky), "html.parser")
    block = soup.find(id="changelog-data")
    if block is None:
        report.warnings.append("V novinky.html chybí blok id=\"changelog-data\".")
        return []

    entries: list[ChangelogEntry] = []
    current_day = ""
    for raw in block.get_text().splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("##"):
            current_day = line.lstrip("#").strip()
            continue
        m = re.match(r"^-\s*\[(\w+)\]\s*(.+)$", line)
        if not m:
            continue
        kind, rest = m.group(1).lower(), m.group(2).strip()

        if kind == "rename":
            parts = re.split(r"\s*(?:>|→|->)\s*", rest, maxsplit=1)
            if len(parts) == 2:
                entries.append(ChangelogEntry("rename", parts[0].strip(),
                                              new_slug=parts[1].strip(), day=current_day))
            else:
                report.warnings.append(f"Nečitelný rename v changelogu: {line}")
            continue

        fields = [f.strip() for f in rest.split("|")]
        entries.append(ChangelogEntry(
            kind=kind,
            slug=fields[0],
            title=fields[1] if len(fields) > 1 else "",
            desc=fields[2] if len(fields) > 2 else "",
            day=current_day,
        ))
    return entries


# ──────────────────────────────────────────────────────────────────────
# Krok 3 — mapování slug -> soubor
# ──────────────────────────────────────────────────────────────────────

def build_index(export_root: Path) -> tuple[dict, list]:
    """
    Projde HTML v exportu a postaví index slug -> relativní cesta.

    Export používá názvy jako 'Zapustkove kovani.html', zatímco changelog
    pracuje se slugy. Proto se indexuje obojí: přesná cesta i normalizovaný
    tvar. Kolize se hlásí, nikdy se netipuje.
    """
    by_exact: dict[str, str] = {}
    by_norm: dict[str, list[str]] = {}
    pages: list[str] = []

    for path in sorted(export_root.rglob("*.html")):
        if any(p in SKIP_NAMES for p in path.parts):
            continue
        rel = path.relative_to(export_root).as_posix()
        if rel in UNTRACKED_PAGES:
            continue
        pages.append(rel)
        stem = rel[:-len(".html")]
        by_exact[stem] = rel
        by_norm.setdefault(slugify(stem), []).append(rel)

    return {"exact": by_exact, "norm": by_norm}, pages


def resolve(slug: str, index: dict, report: Report) -> str | None:
    """Slug z changelogu -> skutečná cesta k souboru."""
    if slug in index["exact"]:
        return index["exact"][slug]
    hits = index["norm"].get(slugify(slug), [])
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        report.warnings.append(f"Slug '{slug}' odpovídá více souborům: {hits}")
    return None


# ──────────────────────────────────────────────────────────────────────
# Krok 4 — vkládání badge
# ──────────────────────────────────────────────────────────────────────

def inject_badge(html: str, first_seen: str) -> str:
    """Vloží data-first-seen na <body> a jednorázově přidá JS pro badge."""
    html = re.sub(r"\s*data-first-seen=\"[^\"]*\"", "", html, count=1)
    html = re.sub(
        r"(<body\b)",
        lambda m: f'{m.group(1)} data-first-seen="{first_seen}"',
        html, count=1, flags=re.I,
    )
    if MARK_START not in html:
        snippet = BADGE_SNIPPET.format(start=MARK_START, end=MARK_END, days=BADGE_DAYS)
        if re.search(r"</body>", html, re.I):
            html = re.sub(r"</body>", snippet + "\n</body>", html, count=1, flags=re.I)
        else:
            html += "\n" + snippet
    return html


# ──────────────────────────────────────────────────────────────────────
# Krok 5 — hlavní logika
# ──────────────────────────────────────────────────────────────────────

def sync(args) -> int:
    src = Path(args.source).expanduser().resolve()
    repo = Path(args.repo).expanduser().resolve()
    repo.mkdir(parents=True, exist_ok=True)
    manifest_path = repo / MANIFEST_NAME
    today = date.today().isoformat()
    report = Report()

    manifest: dict = {}
    if manifest_path.exists():
        manifest = json.loads(read_text(manifest_path))
    elif not args.baseline:
        print(f"⚠  {MANIFEST_NAME} neexistuje. První běh spusť s přepínačem --baseline,")
        print("   jinak by všech ~70 stránek dostalo badge „Novinka“.")
        return 1

    with tempfile.TemporaryDirectory() as td:
        export_root = prepare_source(src, Path(td))
        print(f"Kořen exportu: {export_root.name}/")

        entries = parse_changelog(export_root, report)
        index, pages = build_index(export_root)

        # ---- přejmenování (před porovnáním, aby se zachovalo first_seen) ----
        for e in (x for x in entries if x.kind == "rename"):
            old_file = manifest.get(e.slug, {}).get("file")
            new_file = resolve(e.new_slug, index, report)
            if e.slug in manifest and new_file:
                rec = manifest.pop(e.slug)
                rec["file"] = new_file
                manifest[e.new_slug] = rec
                report.renamed.append((e.slug, e.new_slug))
                if old_file and (repo / old_file).exists() and not args.dry_run:
                    trash = repo / "_trash" / old_file
                    trash.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(repo / old_file), str(trash))
            else:
                report.warnings.append(
                    f"Rename '{e.slug}' → '{e.new_slug}' se nepodařilo spárovat."
                )

        for e in (x for x in entries if x.kind == "delete"):
            report.warnings.append(
                f"Changelog hlásí smazání '{e.slug}'. Skript nemaže — odstraň ručně."
            )

        # ---- popisky z changelogu ----
        notes: dict[str, ChangelogEntry] = {}
        for e in entries:
            if e.kind in ("new", "edit", "layout"):
                f = resolve(e.slug, index, report)
                if f:
                    notes[f] = e

        file_to_slug = {rec["file"]: slug for slug, rec in manifest.items()}

        # ---- porovnání stránek ----
        for rel in pages:
            src_html = read_text(export_root / rel)
            h = normalized_hash(src_html)
            slug = file_to_slug.get(rel) or slugify(rel[:-5])
            rec = manifest.get(slug)
            note = notes.get(rel)
            title = (note.title if note and note.title
                     else page_title(src_html, Path(rel).stem))
            category = rel.split("/")[0] if "/" in rel else ""

            if rec is None:
                first_seen = today
                badge = not args.baseline
                manifest[slug] = {
                    "file": rel,
                    "title": title,
                    "category": category,
                    "content_hash": h,
                    "written_hash": "",
                    "first_seen": first_seen,
                    "last_changed": today,
                    "badge": badge,
                    "locked": False,
                    "note": note.desc if note else "",
                }
                report.new.append((slug, title))
                write_page(repo, rel, src_html, first_seen if badge else None,
                           manifest[slug], args.dry_run)
                continue

            if rec.get("locked"):
                report.warnings.append(f"'{slug}' je zamčená (locked), přeskakuji.")
                continue

            # ruční úprava v repu?
            target = repo / rec["file"]
            if target.exists() and rec.get("written_hash") and not args.force:
                if normalized_hash(read_text(target)) != rec["written_hash"]:
                    report.manual.append(slug)
                    if h != rec["content_hash"] and not args.dry_run:
                        new_path = target.with_suffix(".html.new")
                        new_path.write_text(src_html, encoding="utf-8")
                    continue

            if h == rec["content_hash"] and target.exists():
                report.unchanged.append(slug)
                continue

            rec.update({
                "file": rel,
                "title": title,
                "category": category,
                "content_hash": h,
                "last_changed": today,
            })
            if note and note.desc:
                rec["note"] = note.desc
            report.changed.append((slug, title))
            fs = rec["first_seen"] if rec.get("badge") else None
            write_page(repo, rel, src_html, fs, rec, args.dry_run)

        # ---- ostatní soubory (assety, novinky, konfigurace) ----
        copied_assets = copy_assets(export_root, repo, args.dry_run)

    if not args.dry_run:
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    print_report(report, copied_assets, args)
    return 0


def write_page(repo: Path, rel: str, html: str, first_seen, rec: dict, dry: bool) -> None:
    out = html if first_seen is None else inject_badge(html, first_seen)
    rec["written_hash"] = normalized_hash(out)
    if dry:
        return
    target = repo / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out, encoding="utf-8")


def copy_assets(export_root: Path, repo: Path, dry: bool) -> int:
    """Zkopíruje vše, co není sledovaná stránka: .jsx, support.js, obrázky, konfigurace."""
    count = 0
    for path in export_root.rglob("*"):
        if not path.is_file():
            continue
        if any(p in SKIP_NAMES for p in path.parts):
            continue
        rel = path.relative_to(export_root).as_posix()
        if path.suffix.lower() == ".html" and rel not in UNTRACKED_PAGES:
            continue
        target = repo / rel
        if target.exists() and target.read_bytes() == path.read_bytes():
            continue
        count += 1
        if not dry:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    return count


def print_report(r: Report, assets: int, args) -> None:
    print()
    if args.dry_run:
        print("── ZKUŠEBNÍ BĚH — nic se nezapsalo ──")
    if args.baseline:
        print("── REŽIM BASELINE — badge se nevkládají ──")

    print(f"  Nové stránky:    {len(r.new)}")
    for slug, title in r.new:
        print(f"     + {title}  ({slug})")
    print(f"  Změněné:         {len(r.changed)}")
    for slug, title in r.changed:
        print(f"     ~ {title}  ({slug})")
    if r.renamed:
        print(f"  Přejmenované:    {len(r.renamed)}")
        for a, b in r.renamed:
            print(f"     → {a}  ->  {b}")
    print(f"  Beze změny:      {len(r.unchanged)}")
    print(f"  Ostatní soubory: {assets} aktualizováno")

    if r.manual:
        print(f"\n  ⚠  Ručně upravené v repu — NEPŘEPSÁNO ({len(r.manual)}):")
        for slug in r.manual:
            print(f"     ! {slug}   (nová verze uložena jako .html.new)")
    if r.warnings:
        print(f"\n  ⚠  Upozornění ({len(r.warnings)}):")
        for w in r.warnings:
            print(f"     - {w}")
    print()


def main() -> int:
    p = argparse.ArgumentParser(
        description="Synchronizace exportu z Claude Design do repozitáře STT.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("source", help="ZIP z Claude Design nebo rozbalená složka")
    p.add_argument("--repo", default=".", help="cílový repozitář (výchozí: aktuální složka)")
    p.add_argument("--dry-run", action="store_true", help="jen ukázat, nic nezapisovat")
    p.add_argument("--baseline", action="store_true",
                   help="první běh: založí manifest, badge nevkládá")
    p.add_argument("--force", action="store_true",
                   help="přepíše i stránky ručně upravené v repu")
    return sync(p.parse_args())


if __name__ == "__main__":
    sys.exit(main())
