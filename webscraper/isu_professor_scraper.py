"""
Scrape Iowa State's public faculty catalog and emit professor records for CourseFlow.

Usage:
  python webscraper/isu_professor_scraper.py --output docs/isu-professors-dataset.json
"""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

FACULTY_URL = "https://catalog.iastate.edu/faculty/"
USER_AGENT = "CourseFlow-Professor-Scraper/1.0 (+https://github.com/)"

WS_RE = re.compile(r"\s+")
TAG_RE = re.compile(r"(?is)<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"(?is)<(script|style)\b.*?</\1>")
H4_RE = re.compile(r"(?is)<h4\b[^>]*>(.*?)</h4>")
HREF_RE = re.compile(r'(?is)<a\b[^>]*href=["\']([^"\']+)["\']')
ROLE_TRAIL_RE = re.compile(
    r"\b(and\s+)?(chair|director|dean|head|coordinator|administrator)\b.*$",
    re.IGNORECASE,
)
LEADING_EMERITUS_RE = re.compile(r"(?i)^emerit(?:us|a)\s+")


def clean(value: str | None) -> str:
    if not value:
        return ""
    return WS_RE.sub(" ", value).strip()


def strip_html(raw_html: str) -> str:
    no_scripts = SCRIPT_STYLE_RE.sub(" ", raw_html or "")
    no_tags = TAG_RE.sub(" ", no_scripts)
    return clean(html.unescape(no_tags))


def normalize_name(name: str) -> str:
    name = clean(name)
    if "," not in name:
        return to_pretty_name(name)
    last, first = [clean(part) for part in name.split(",", 1)]
    if not first:
        return to_pretty_name(last)
    return to_pretty_name(clean(f"{first} {last}"))


def to_pretty_name(name: str) -> str:
    raw = clean(name)
    if not raw:
        return raw
    if not raw.isupper():
        return raw

    titled = raw.title()
    # Keep middle initials uppercase (e.g., "A."), and roman numerals.
    titled = re.sub(r"\b([A-Z])\b", lambda m: m.group(1).upper(), titled)
    titled = re.sub(r"\bIi\b", "II", titled)
    titled = re.sub(r"\bIii\b", "III", titled)
    titled = re.sub(r"\bIv\b", "IV", titled)
    titled = re.sub(r"\bVi\b", "VI", titled)
    return titled


def heading_is_person(heading_text: str) -> bool:
    text = clean(heading_text)
    if not text:
        return False
    if len(text) == 1 and text.isalpha():
        return False
    return "," in text


def extract_profile_url(heading_html: str) -> Optional[str]:
    match = HREF_RE.search(heading_html or "")
    if not match:
        return None
    href = clean(html.unescape(match.group(1)))
    if not href:
        return None
    return urljoin(FACULTY_URL, href)


def extract_external_id(profile_url: str | None, full_name: str) -> str:
    if profile_url:
        path = urlparse(profile_url).path.strip("/")
        if path:
            slug = path.split("/")[-1]
            slug = re.sub(r"[^a-zA-Z0-9_-]+", "", slug)
            if slug:
                return slug.lower()
    token = re.sub(r"[^a-z0-9]+", "-", full_name.lower()).strip("-")
    return token or "unknown-professor"


def extract_department(title_line: str) -> Optional[str]:
    title_line = clean(title_line)
    if not title_line:
        return None

    first_segment = clean(title_line.split(";", 1)[0])
    if not first_segment:
        return None

    lowered = first_segment.lower()
    candidate = None
    if " of " in lowered:
        candidate = first_segment.rsplit(" of ", 1)[1]
    elif " in " in lowered:
        candidate = first_segment.rsplit(" in ", 1)[1]
    elif "," in first_segment:
        candidate = first_segment.split(",", 1)[1]

    if not candidate:
        return None

    candidate = LEADING_EMERITUS_RE.sub("", candidate)
    candidate = ROLE_TRAIL_RE.sub("", candidate)
    candidate = clean(candidate.strip(" ,;."))
    if candidate and candidate.lower().startswith("practice,"):
        candidate = clean(candidate.split(",", 1)[1])
    return candidate or None


def parse_professors(page_html: str) -> List[Dict]:
    professors: List[Dict] = []
    seen_keys = set()

    h4_matches = list(H4_RE.finditer(page_html))
    for idx, match in enumerate(h4_matches):
        heading_html = match.group(1)
        heading_text = strip_html(heading_html)
        if not heading_is_person(heading_text):
            continue

        block_start = match.end()
        block_end = h4_matches[idx + 1].start() if idx + 1 < len(h4_matches) else len(page_html)
        body_html = page_html[block_start:block_end]
        bio = strip_html(body_html)
        title_line = clean(bio.split(". ", 1)[0].strip().strip(".")) if bio else None
        department = extract_department(title_line or "")
        profile_url = extract_profile_url(heading_html)

        full_name = normalize_name(heading_text)
        external_id = extract_external_id(profile_url, full_name)
        dedupe_key = f"{full_name.lower()}::{(department or '').lower()}::{external_id}"
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        professors.append(
            {
                "fullName": full_name,
                "title": title_line,
                "department": department,
                "email": None,
                "profileUrl": profile_url,
                "bio": bio or None,
                "sourceSystem": "ISU_CATALOG",
                "externalId": external_id,
            }
        )

    professors.sort(key=lambda row: row["fullName"])
    return professors


def fetch_html(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=45) as response:
        data = response.read()
    return data.decode("utf-8", errors="replace")


def scrape_professors() -> Dict:
    html_text = fetch_html(FACULTY_URL)
    return {
        "source": FACULTY_URL,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "professors": parse_professors(html_text),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape ISU faculty catalog into CourseFlow JSON.")
    parser.add_argument(
        "--output",
        default="docs/isu-professors-dataset.json",
        help="Output JSON file path.",
    )
    args = parser.parse_args()

    dataset = scrape_professors()
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Scraped {len(dataset['professors'])} professors -> {args.output}")


if __name__ == "__main__":
    main()
