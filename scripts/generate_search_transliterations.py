"""Generate browser search transliterations from indic-transliteration.

Run with Python and the repository's indic-transliteration dependency installed:

    py scripts/generate_search_transliterations.py
"""

import json
import re
import unicodedata
from pathlib import Path

from indic_transliteration import sanscript


ROOT = Path(__file__).resolve().parents[1]
TRANSLATIONS_PATH = ROOT / "translations.json"
SEARCH_INDEX_PATH = ROOT / "data" / "search-index.json"
OUTPUT_PATH = ROOT / "data" / "search-transliterations.json"
LAY_SCHEME = sanscript.SCHEMES[sanscript.OPTITRANS]
SAFE_ALIAS_PATTERN = re.compile(r"^[a-z0-9][a-z0-9 ./()&'\-]*$")


def romanize_kannada(value):
    raw = sanscript.transliterate(value, sanscript.KANNADA, sanscript.OPTITRANS)
    lay_value = LAY_SCHEME.to_lay_indian(raw)
    alias = unicodedata.normalize("NFKC", lay_value).lower()
    alias = re.sub(r"\s+", " ", alias).strip()
    if not alias or not SAFE_ALIAS_PATTERN.fullmatch(alias):
        return None
    return alias


def build_commodity_transliterations(translations, search_index):
    result = {}
    for commodity in search_index.get("commodities", []):
        entry = translations.get(commodity)
        if not isinstance(entry, dict) or not isinstance(entry.get("kn"), str):
            continue
        alias = romanize_kannada(entry["kn"])
        if alias:
            result[commodity] = alias
    return result


def build_variety_transliterations(translations, search_index):
    result = {}
    for item in search_index.get("varieties", []):
        commodity = item.get("commodity")
        variety = item.get("variety")
        entry = translations.get(variety)
        if not commodity or not variety or not isinstance(entry, dict):
            continue
        if not isinstance(entry.get("kn"), str):
            continue
        alias = romanize_kannada(entry["kn"])
        if alias:
            result[f"{commodity}::{variety}"] = alias
    return result


def main():
    translations_payload = json.loads(TRANSLATIONS_PATH.read_text(encoding="utf-8"))
    search_index = json.loads(SEARCH_INDEX_PATH.read_text(encoding="utf-8"))
    payload = {
        "generator": "indic-transliteration",
        "version": "2.3.82",
        "scheme": "optitrans-lay-indian",
        "commodities": build_commodity_transliterations(
            translations_payload.get("commodities", {}), search_index
        ),
        "varieties": build_variety_transliterations(
            translations_payload.get("varieties", {}), search_index
        ),
    }
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Generated {len(payload['commodities'])} commodity and "
        f"{len(payload['varieties'])} variety transliterations at {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
