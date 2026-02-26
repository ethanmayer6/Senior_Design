"""
Scrape Iowa State catalog data for majors + degree requirements (+ optionally all courses)
and emit CourseFlow's IsuDegreeDataset JSON format.

Usage:
  python webscraper/isu_degree_scraper.py --output docs/isu-degree-dataset.json --catalog-year 2026-2027 --include-courses
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
import re
import time
from urllib.parse import urlparse
from dataclasses import dataclass, asdict
from typing import Iterable, List, Set, Dict
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag


BASE = "https://catalog.iastate.edu"
MAJORS_INDEX_PATH = "/collegescurricula/"
USER_AGENT = "CourseFlow-ISU-Scraper/1.0 (+https://github.com/)"
MAX_APPROVED_LINKS_PER_MAJOR = 8
MAX_NESTED_APPROVED_LINKS = 20
MAX_APPROVED_ENRICH_SECONDS = 15.0
MAX_APPROVED_HTML_CHARS = 600_000

COURSE_IDENT_RE = re.compile(r"\b([A-Z]{2,8})\s+(\d{3,4}[A-Z]?)\b")
COURSE_IDENT_COMPACT_RE = re.compile(r"\b([A-Z]{2,8})(\d{3,4}[A-Z]?)\b")
COURSE_IDENT_SLASH_RE = re.compile(
    r"\b([A-Z]{2,8})\s*(\d{3,4}[A-Z]?)\s*/\s*([A-Z]{2,8})?\s*(\d{3,4}[A-Z]?)\b"
)
CREDITS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:credits?|cr\.?)", re.IGNORECASE)
OPTION_HINT_RE = re.compile(r"\b(one of|choose|or)\b", re.IGNORECASE)
APPROVED_LIST_HINT_RE = re.compile(
    r"(approved\s+list|program-approved|supplemental\s+elective|supplementary\s+elective|technical\s+elective|software\s+engineering\s+elective|general\s+education\s+elective|approved\s+courses)",
    re.IGNORECASE,
)


@dataclass
class RequirementGroupImport:
    name: str
    satisfyingCredits: int
    courseIdents: List[str]


@dataclass
class DegreeRequirementImport:
    name: str
    satisfyingCredits: int
    courseIdents: List[str]
    requirementGroups: List[RequirementGroupImport]


@dataclass
class MajorImport:
    name: str
    college: str
    description: str
    degreeRequirements: List[DegreeRequirementImport]


@dataclass
class IsuDegreeDataset:
    source: str
    catalogYear: str
    courses: List[dict]
    majors: List[MajorImport]


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def to_ident(raw: str) -> str:
    raw = clean(raw).upper()
    return raw.replace(" ", "_")


def normalize_course_number(raw_number: str) -> str | None:
    token = clean(raw_number or "").upper()
    m = re.fullmatch(r"(\d{3,4})([A-Z]?)", token)
    if not m:
        return None
    digits = m.group(1)
    suffix = m.group(2) or ""
    if len(digits) == 3:
        digits = digits + "0"
    if len(digits) != 4:
        return None
    return digits + suffix


def extract_course_idents(text: str) -> Set[str]:
    result: Set[str] = set()
    source = text or ""
    for match in COURSE_IDENT_RE.finditer(source):
        dept, num = match.group(1), match.group(2)
        normalized_num = normalize_course_number(num)
        if normalized_num:
            result.add(f"{dept}_{normalized_num}")
    for match in COURSE_IDENT_COMPACT_RE.finditer(source):
        dept, num = match.group(1), match.group(2)
        normalized_num = normalize_course_number(num)
        if normalized_num:
            result.add(f"{dept}_{normalized_num}")
    for match in COURSE_IDENT_SLASH_RE.finditer(source):
        dept1 = match.group(1)
        num1 = normalize_course_number(match.group(2))
        dept2 = match.group(3) or dept1
        num2 = normalize_course_number(match.group(4))
        if num1:
            result.add(f"{dept1}_{num1}")
        if num2:
            result.add(f"{dept2}_{num2}")
    return result


def is_valid_course_ident(ident: str) -> bool:
    return bool(re.fullmatch(r"[A-Z]{2,8}_\d{4}[A-Z]?", clean(ident or "").upper()))


def sanitize_course_idents(course_ids: Iterable[str], known_course_idents: Set[str] | None = None) -> List[str]:
    deduped: Set[str] = set()
    for cid in course_ids:
        normalized = clean(cid).upper()
        if not is_valid_course_ident(normalized):
            continue
        if known_course_idents and normalized not in known_course_idents:
            # Keep unknown ids only if we don't have a known catalog reference set.
            # When we do have one, filtering reduces malformed captures (e.g., CHEM_178).
            continue
        deduped.add(normalized)
    return sorted(deduped)


def infer_college_from_path(path: str) -> str:
    key = (path or "").lower()
    if "engineering" in key:
        return "ENGINEERING"
    if "business" in key:
        return "BUSINESS"
    if "agriculture" in key:
        return "AGRICULTURE_AND_LIFE_SCIENCES"
    if "human" in key:
        return "HUMAN_SCIENCE"
    if "veterinary" in key:
        return "VETERINARY_MEDICINE"
    if "education" in key:
        return "SCHOOL_OF_EDUCATION"
    if "graduate" in key:
        return "GRADUATE_COLLEGE"
    return "LIBERAL_ARTS_AND_SCIENCES"


def credits_from_text(text: str) -> int:
    raw = clean(text or "")
    m = CREDITS_RE.search(raw)
    if m:
        return int(float(m.group(1)))

    # Catalog table hour cells sometimes contain a bare number like "3" or "4."
    compact = raw.strip().rstrip(".")
    if re.fullmatch(r"\d+(?:\.\d+)?", compact):
        return int(float(compact))

    # Handle text like "Choose one of the following: 3"
    tail_num = re.search(r":\s*(\d+(?:\.\d+)?)\s*$", raw)
    if tail_num:
        return int(float(tail_num.group(1)))

    return 0


def credits_from_catalog_value(value: str) -> int:
    """
    Examples from catalog:
    - "4."
    - "( Cross-listed with COMS 3090 ). Credits: 3. Contact Hours: Lecture 3."
    - "Required."
    - "Variable."
    """
    if not value:
        return 0
    raw = clean(value)

    # Prefer explicit "Credits: N" when present.
    m = re.search(r"credits?\s*:\s*(\d+(?:\.\d+)?)", raw, flags=re.IGNORECASE)
    if m:
        return int(float(m.group(1)))

    # Sometimes the credits cell is just "4.".
    compact = raw.strip().rstrip(".")
    if re.fullmatch(r"\d+(?:\.\d+)?", compact):
        return int(float(compact))

    # "Credits: Required" appears on some required seminar/orientation rows.
    if re.search(r"credits?\s*:\s*required", raw, flags=re.IGNORECASE):
        m = re.search(r"contact\s+hours?:[^0-9]*(\d+)", raw, flags=re.IGNORECASE)
        return int(m.group(1)) if m else 0

    # Generic fallback near credit wording.
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:credits?|cr\.?)", raw, flags=re.IGNORECASE)
    if m:
        return int(float(m.group(1)))

    return 0


def label_kind(label: str) -> str:
    lowered = clean(label).lower()
    compact = re.sub(r"[^a-z]", "", lowered)
    if "open elective" in lowered:
        return "open_elective"
    if "math elective" in lowered or "mathematics elective" in lowered:
        return "math_elective"
    if "software engineering elective" in lowered or "softwareengineeringelective" in compact:
        return "software_engineering_elective"
    if (
        "supplemental elective" in lowered
        or "supplementary elective" in lowered
        or "supplementalelective" in compact
        or "supplementaryelective" in compact
    ):
        return "supplemental_elective"
    if "technical elective" in lowered or "technicalelective" in compact:
        return "technical_elective"
    if "general education elective" in lowered or "generaleducationelective" in compact:
        return "general_education_elective"
    if "elective" in lowered:
        return "generic_elective"
    return "other"


def fetch_html(session: requests.Session, url: str, timeout: int = 30, retries: int = 5) -> str:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as e:
            last_err = e
            if attempt == retries:
                break
            time.sleep(min(2.0, 0.25 * attempt))
    raise RuntimeError(f"Failed to fetch HTML from {url}: {last_err}")


def fetch_bytes(session: requests.Session, url: str, timeout: int = 45, retries: int = 5) -> bytes:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.content
        except requests.RequestException as e:
            last_err = e
            if attempt == retries:
                break
            time.sleep(min(2.0, 0.25 * attempt))
    raise RuntimeError(f"Failed to fetch bytes from {url}: {last_err}")


def extract_course_groups_from_text(text: str, default_group_name: str) -> Dict[str, Set[str]]:
    groups: Dict[str, Set[str]] = {}
    current_group = default_group_name
    groups.setdefault(current_group, set())

    lines = [clean(line) for line in (text or "").splitlines() if clean(line)]
    for line in lines:
        line_ids = extract_course_idents(line)
        lowered = line.lower()
        looks_like_heading = (
            "elective" in lowered
            and not line_ids
            and len(line) <= 110
            and not re.search(r"\b(credits?|cr\.?)\b", lowered)
            and "http://" not in lowered
            and "https://" not in lowered
            and "can be used" not in lowered
            and not lowered.startswith("note:")
            and "for prereq" not in lowered
        )
        if looks_like_heading:
            current_group = line[:180]
            groups.setdefault(current_group, set())
            continue
        if line_ids:
            groups.setdefault(current_group, set()).update(line_ids)
    return groups


def parse_pdf_course_groups(pdf_bytes: bytes, default_group_name: str) -> Dict[str, Set[str]]:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        try:
            from PyPDF2 import PdfReader  # type: ignore
        except Exception:
            print("[WARN] Skipping PDF approved-list parsing because neither 'pypdf' nor 'PyPDF2' is installed.")
            return {}

    text_parts: List[str] = []
    reader = PdfReader(io.BytesIO(pdf_bytes))
    for page in reader.pages:
        text_parts.append(page.extract_text() or "")
    return extract_course_groups_from_text("\n".join(text_parts), default_group_name)


def parse_html_course_groups(html: str, default_group_name: str) -> Dict[str, Set[str]]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n", strip=True)
    return extract_course_groups_from_text(text, default_group_name)


def extract_approved_links(soup: BeautifulSoup, page_url: str) -> List[str]:
    links: Set[str] = set()
    for a in soup.select("a[href]"):
        href = clean(a.get("href", ""))
        if not href:
            continue
        full = urljoin(page_url, href)
        text = clean(a.get_text(" ", strip=True))
        haystack = f"{text} {href}"
        if APPROVED_LIST_HINT_RE.search(haystack):
            links.add(full)
            continue
        if ("elective" in haystack.lower()) and ("se.iastate.edu" in full.lower() or "iastate.edu" in full.lower()):
            links.add(full)
    return sorted(links)


def approved_link_priority(url: str) -> tuple[int, int, int]:
    lower = clean(url).lower()
    host = (urlparse(url).netloc or "").lower()
    is_pdf = lower.endswith(".pdf")
    is_iastate = host.endswith("iastate.edu") or "iastate.edu" in host
    return (0 if is_pdf else 1, 0 if is_iastate else 1, len(lower))


def discover_wordpress_media_links(
    session: requests.Session,
    seed_url: str,
    requirement_labels: List[str],
) -> Set[str]:
    parsed = urlparse(seed_url)
    if not parsed.scheme or not parsed.netloc:
        return set()
    base = f"{parsed.scheme}://{parsed.netloc}"
    endpoint = f"{base}/wp-json/wp/v2/media"

    search_terms: Set[str] = set()
    for label in requirement_labels:
        kind = label_kind(label)
        if kind == "software_engineering_elective":
            search_terms.update({"software engineering elective", "se elective", "electives"})
        elif kind == "supplemental_elective":
            search_terms.update({"supplemental electives", "supplementary electives", "electives"})
        elif kind == "technical_elective":
            search_terms.update({"technical electives", "electives"})
        elif kind == "general_education_elective":
            search_terms.update({"general education elective", "electives"})
        elif kind == "generic_elective":
            search_terms.add("electives")

    if not search_terms:
        return set()

    found: Set[str] = set()
    for term in sorted(search_terms):
        try:
            resp = session.get(
                endpoint,
                params={"search": term, "per_page": 100},
                timeout=30,
            )
            if resp.status_code != 200:
                continue
            items = resp.json()
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                source_url = clean(str(item.get("source_url") or ""))
                if not source_url:
                    continue
                title = clean(str(((item.get("title") or {}).get("rendered")) if isinstance(item.get("title"), dict) else ""))
                combined = f"{source_url} {title}".lower()
                if not source_url.lower().endswith(".pdf"):
                    continue
                if "elective" not in combined and "approved" not in combined:
                    continue
                found.add(source_url)
        except Exception:
            continue
    return found


def load_approved_resource_groups(
    session: requests.Session,
    url: str,
    cache: Dict[str, Dict[str, Set[str]]],
    requirement_labels: List[str] | None = None,
    depth: int = 0,
) -> Dict[str, Set[str]]:
    if url in cache:
        return cache[url]

    default_group_name = "Approved Elective List"
    try:
        if url.lower().endswith(".pdf"):
            data = fetch_bytes(session, url, timeout=30, retries=3)
            parsed = parse_pdf_course_groups(data, default_group_name)
        else:
            html = fetch_html(session, url, timeout=20, retries=3)
            parsed = parse_html_course_groups(html, default_group_name) if len(html) <= MAX_APPROVED_HTML_CHARS else {}
            if depth < 1:
                soup = BeautifulSoup(html, "html.parser")
                nested_links = set(extract_approved_links(soup, url))
                if requirement_labels:
                    nested_links.update(discover_wordpress_media_links(session, url, requirement_labels))
                current_host = (urlparse(url).netloc or "").lower()
                filtered_nested: Set[str] = set()
                for nested in nested_links:
                    nested_host = (urlparse(nested).netloc or "").lower()
                    nested_lower = nested.lower()
                    # Keep direct PDFs. Keep same-host HTML only when the URL appears elective-list related.
                    if nested_lower.endswith(".pdf"):
                        filtered_nested.add(nested)
                        continue
                    looks_relevant = any(
                        token in nested_lower
                        for token in ("elective", "approved", "option", "cohort", "curriculum", "checklist")
                    )
                    if nested_host and nested_host == current_host and looks_relevant:
                        filtered_nested.add(nested)
                nested_links = filtered_nested
                prioritized_nested = sorted(nested_links, key=approved_link_priority)[:MAX_NESTED_APPROVED_LINKS]
                for nested in prioritized_nested:
                    nested_groups = load_approved_resource_groups(
                        session,
                        nested,
                        cache,
                        requirement_labels=requirement_labels,
                        depth=depth + 1,
                    )
                    for group_name, ids in nested_groups.items():
                        if not ids:
                            continue
                        parsed.setdefault(group_name, set()).update(ids)
        cache[url] = parsed
        return parsed
    except Exception:
        cache[url] = {}
        return {}


def find_best_group_ids_for_label(
    label: str,
    approved_groups: Dict[str, Set[str]],
) -> Set[str]:
    if not approved_groups:
        return set()
    target_kind = label_kind(label)
    if target_kind in {"other", "open_elective", "math_elective"}:
        return set()

    best_match_ids: Set[str] = set()
    best_score = -1
    for group_name, ids in approved_groups.items():
        if not ids:
            continue
        group_kind = label_kind(group_name)
        score = 0
        if target_kind == group_kind:
            score += 100
        if target_kind in {"software_engineering_elective", "supplemental_elective", "technical_elective"} and group_kind == "generic_elective":
            score -= 25
        target_tokens = set(re.findall(r"[a-z]+", label.lower()))
        group_tokens = set(re.findall(r"[a-z]+", group_name.lower()))
        overlap = len(target_tokens.intersection(group_tokens))
        score += overlap * 10
        if "elective" in group_name.lower():
            score += 1
        if len(ids) > 300:
            score -= 50
        if score > best_score:
            best_score = score
            best_match_ids = set(ids)

    if best_score <= 10:
        return set()
    return best_match_ids


def augment_requirements_with_approved_groups(
    requirements: List[DegreeRequirementImport],
    approved_groups: Dict[str, Set[str]],
) -> None:
    if not approved_groups:
        return

    for req in requirements:
        # Fill placeholder elective groups created from requirement rows.
        for idx, group in enumerate(req.requirementGroups):
            if group.courseIdents:
                continue
            match_ids = find_best_group_ids_for_label(group.name or req.name, approved_groups)
            if not match_ids:
                continue
            req.requirementGroups[idx] = RequirementGroupImport(
                name=group.name,
                satisfyingCredits=group.satisfyingCredits,
                courseIdents=sorted(match_ids),
            )

        # If requirement itself is elective-only and has no explicit courses, attach a group.
        if not req.courseIdents and not any(g.courseIdents for g in req.requirementGroups):
            match_ids = find_best_group_ids_for_label(req.name, approved_groups)
            if match_ids:
                req.requirementGroups.append(
                    RequirementGroupImport(
                        name=f"{req.name} approved list",
                        satisfyingCredits=max(0, req.satisfyingCredits),
                        courseIdents=sorted(match_ids),
                    )
                )


def parse_course_block(block: Tag, source_url: str) -> dict | None:
    title_container = block.select_one(".courseblocktitle")
    if not title_container:
        return None
    title_text = clean(title_container.get_text(" ", strip=True))
    # Example: "COM S 2270: Introduction to Object-Oriented Programming"
    m = re.match(r"^\s*([A-Z& ]+)\s+(\d{3,4}[A-Z]?)\s*:\s*(.+)\s*$", title_text)
    if not m:
        return None

    dept = clean(m.group(1)).replace(" ", "")
    number = clean(m.group(2))
    name = clean(m.group(3))
    course_ident = f"{dept}_{number}"

    desc_container = block.select_one(".courseblockdesc")
    credits_text = ""
    prereq_text = ""
    description_text = ""
    offered_text = ""

    if desc_container:
        credits_p = desc_container.select_one("p.credits")
        prereq_p = desc_container.select_one("p.prereq")
        credits_text = clean(credits_p.get_text(" ", strip=True)) if credits_p else ""
        prereq_text = clean(prereq_p.get_text(" ", strip=True)) if prereq_p else ""

        if prereq_p:
            description_text = prereq_text
        else:
            description_text = clean(desc_container.get_text(" ", strip=True))

        offered_match = re.search(r"Typically Offered:\s*(.*)$", description_text, flags=re.IGNORECASE)
        if offered_match:
            offered_text = clean(offered_match.group(1).strip("(). "))

        if prereq_text:
            description_text = description_text.replace(prereq_text, "").strip()
        if offered_match:
            description_text = description_text[:offered_match.start()].strip()
        if not description_text:
            description_text = f"Imported from ISU catalog for {course_ident}."

    prereqs = sorted(extract_course_idents(prereq_text))

    return {
        "courseIdent": course_ident,
        "name": name,
        "credits": credits_from_catalog_value(credits_text),
        "prereqTxt": prereq_text or None,
        "prerequisites": prereqs,
        "description": description_text,
        "hours": credits_text or None,
        "offered": offered_text or None,
    }


def iter_az_subject_links(soup: BeautifulSoup) -> Iterable[str]:
    seen = set()
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if not href.startswith("/azcourses/") or href == "/azcourses/":
            continue
        full = urljoin(BASE, href)
        if full in seen:
            continue
        seen.add(full)
        yield full


def scrape_all_courses(session: requests.Session, delay_seconds: float) -> List[dict]:
    az_index_url = urljoin(BASE, "/azcourses/")
    az_index_html = fetch_html(session, az_index_url, timeout=20, retries=3)
    az_soup = BeautifulSoup(az_index_html, "html.parser")
    subject_links = list(iter_az_subject_links(az_soup))

    by_ident: dict[str, dict] = {}
    for subject_url in subject_links:
        try:
            html = fetch_html(session, subject_url, timeout=20, retries=3)
            soup = BeautifulSoup(html, "html.parser")
            for block in soup.select("div.courseblock"):
                parsed = parse_course_block(block, subject_url)
                if not parsed:
                    continue
                ident = parsed["courseIdent"]
                # Prefer first seen; pages are generally unique.
                by_ident.setdefault(ident, parsed)
            time.sleep(delay_seconds)
        except Exception:
            continue

    return list(by_ident.values())


def iter_major_links(soup: BeautifulSoup) -> Iterable[str]:
    seen = set()
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if not href.startswith("/") or "/college" not in href:
            continue
        if "/courses/" in href or "/minor/" in href or "/certificate/" in href:
            continue
        # Prefer major-program pages: /college.../<program>/
        if not re.match(r"^/college[^/]+/[^/]+/?$", href):
            continue
        full = urljoin(BASE, href)
        if full in seen:
            continue
        seen.add(full)
        yield full


def collect_section_until_next_heading(start: Tag) -> List[Tag]:
    nodes: List[Tag] = []
    cur = start.find_next_sibling()
    while cur:
        if cur.name in {"h2", "h3", "h4", "h5"}:
            break
        if isinstance(cur, Tag):
            nodes.append(cur)
        cur = cur.find_next_sibling()
    return nodes


def normalize_heading_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").strip().lower()).strip("_")


def normalize_requirement_name(text: str) -> str:
    raw = clean(text or "")
    # Remove trailing footnote artifacts like "General Education Requirements: 21 cr. 2"
    raw = re.sub(r"(\bcr\.?)\s+\d+$", r"\1", raw, flags=re.IGNORECASE)
    # Normalize duplicate spaces created by cleanup.
    return clean(raw)


def strip_trailing_footnote_suffix(text: str) -> str:
    raw = clean(text or "")
    if not raw:
        return raw
    # Keep explicit option labels intact, but trim trailing standalone footnote markers.
    if re.search(r"\boption\s+\d+$", raw, flags=re.IGNORECASE):
        return raw
    return re.sub(r"\s+\d+$", "", raw).strip()


def extract_requirement_chunks(section_nodes: List[Tag]) -> List[str]:
    """
    Prefer finer-grained chunks (list rows, table rows, paragraphs) so
    alternatives like "STAT 1010 or STAT 1040" become groups instead of
    being flattened into "take all".
    """
    chunks: List[str] = []
    for node in section_nodes:
        # Most curricular sections are list/table based.
        for child in node.select("li, tr, p"):
            text = clean(child.get_text(" ", strip=True))
            if text:
                chunks.append(text)
    if chunks:
        return chunks
    return [clean(n.get_text(" ", strip=True)) for n in section_nodes if clean(n.get_text(" ", strip=True))]


def parse_requirement_from_tables(header_text: str, section_nodes: List[Tag]) -> DegreeRequirementImport | None:
    tables: List[Tag] = []
    for node in section_nodes:
        if node.name == "table" and "sc_courselist" in (node.get("class") or []):
            tables.append(node)
        tables.extend(node.select("table.sc_courselist"))

    if not tables:
        return None

    direct_courses: Set[str] = set()
    groups: List[RequirementGroupImport] = []
    option_ids: Set[str] = set()
    option_credits = 0
    option_index = 1
    option_mode = False
    option_group_label: str | None = None
    option_rows_without_hours = 0
    pending_or = False
    last_direct_ident: str | None = None
    last_direct_credits = 0

    def flush_option_group() -> None:
        nonlocal option_ids, option_credits, option_index, option_mode, option_group_label, option_rows_without_hours
        if len(option_ids) > 1:
            group_name = option_group_label[:180] if option_group_label else f"{header_text} option {option_index}"
            groups.append(
                RequirementGroupImport(
                    name=group_name,
                    satisfyingCredits=option_credits,
                    courseIdents=sorted(option_ids),
                )
            )
            option_index += 1
        elif len(option_ids) == 1:
            direct_courses.update(option_ids)
        option_ids = set()
        option_credits = 0
        option_mode = False
        option_group_label = None
        option_rows_without_hours = 0

    for table in tables:
        for tr in table.select("tr"):
            comment_el = tr.select_one("span.courselistcomment")
            comment_text = clean(comment_el.get_text(" ", strip=True)) if comment_el else ""
            comment_lower = comment_text.lower()
            label_td = tr.select_one("td.codecol") or tr.select_one("td")
            row_label_text = clean(label_td.get_text(" ", strip=True)) if label_td else ""
            row_label_lower = row_label_text.lower()
            row_text = clean(tr.get_text(" ", strip=True))
            row_lower = row_text.lower()
            hours_td = tr.select_one("td.hourscol")
            row_hours_text = clean(hours_td.get_text(" ", strip=True)) if hours_td else ""
            row_hours = credits_from_text(row_hours_text)
            code_link = tr.select_one("td.codecol a.code")
            choose_row = ("choose" in row_lower and "following" in row_lower)

            if choose_row:
                flush_option_group()
                option_credits = row_hours or credits_from_text(row_text)
                option_ids = set()
                option_mode = True
                option_rows_without_hours = 0
                if "elective" in row_label_lower:
                    option_group_label = normalize_requirement_name(row_label_text)
                continue

            # Close an active option block when we hit a normal credit-bearing row.
            if option_mode and code_link and row_hours > 0 and option_rows_without_hours > 0 and not row_lower.startswith("or "):
                flush_option_group()
            if option_mode and (not code_link) and row_hours > 0 and option_rows_without_hours > 0 and ("total credits" not in row_lower):
                flush_option_group()

            is_pool_like_row = (
                (
                    "elective" in row_label_lower
                    or "approved" in row_label_lower
                    or "arts and humanities" in row_label_lower
                    or "social sciences" in row_label_lower
                )
                and ("total credits" not in row_lower)
                and row_hours > 0
                and not code_link
            )
            if is_pool_like_row:
                group_name = strip_trailing_footnote_suffix(normalize_requirement_name(row_label_text or row_text))
                if not group_name:
                    continue
                group_credits = row_hours or credits_from_text(row_text)
                groups.append(
                    RequirementGroupImport(
                        name=group_name[:180],
                        satisfyingCredits=group_credits,
                        courseIdents=[],
                    )
                )
                continue

            if "choose" in comment_lower and "following" in comment_lower:
                flush_option_group()
                option_credits = credits_from_text(clean(hours_td.get_text(" ", strip=True)) if hours_td else "")
                option_ids = set()
                option_mode = True
                continue

            if comment_lower.startswith("or"):
                pending_or = True
                continue

            if not code_link:
                # Non-course row.
                if "total credits" in comment_lower or "total credits" in row_lower:
                    flush_option_group()
                continue

            ident = to_ident(code_link.get_text(" ", strip=True))
            if not ident:
                continue
            if row_label_lower.startswith("or "):
                pending_or = True

            if option_mode:
                option_ids.add(ident)
                if row_hours == 0:
                    option_rows_without_hours += 1
            else:
                if pending_or and last_direct_ident:
                    group_pair = sorted({last_direct_ident, ident})
                    if len(group_pair) > 1:
                        if last_direct_ident in direct_courses:
                            direct_courses.remove(last_direct_ident)
                        pair_credits = row_hours or last_direct_credits
                        groups.append(
                            RequirementGroupImport(
                                name=f"{header_text} option {option_index}",
                                satisfyingCredits=pair_credits,
                                courseIdents=group_pair,
                            )
                        )
                        option_index += 1
                        pending_or = False
                        last_direct_ident = None
                        last_direct_credits = 0
                    else:
                        direct_courses.add(ident)
                        last_direct_ident = ident
                        last_direct_credits = row_hours
                        pending_or = False
                else:
                    direct_courses.add(ident)
                    last_direct_ident = ident
                    last_direct_credits = row_hours

    flush_option_group()

    # Merge duplicate option groups.
    deduped_groups: List[RequirementGroupImport] = []
    seen_keys: Set[tuple] = set()
    for g in groups:
        ids_key = tuple(sorted(g.courseIdents))
        if ids_key:
            key: tuple = ("IDS", ids_key)
        else:
            key = ("NAME", normalize_heading_key(g.name), int(g.satisfyingCredits))
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped_groups.append(g)

    option_course_ids = {cid for g in deduped_groups for cid in g.courseIdents}
    direct_courses = {cid for cid in direct_courses if cid not in option_course_ids}

    if not direct_courses and not deduped_groups:
        return None

    return DegreeRequirementImport(
        name=header_text[:180],
        satisfyingCredits=credits_from_text(header_text),
        courseIdents=sorted(direct_courses),
        requirementGroups=deduped_groups,
    )


def build_requirement_from_section(header_text: str, section_nodes: List[Tag]) -> DegreeRequirementImport | None:
    normalized_header = normalize_requirement_name(header_text)
    table_based = parse_requirement_from_tables(normalized_header, section_nodes)
    if table_based is not None:
        return table_based

    chunks = extract_requirement_chunks(section_nodes)
    direct_courses: Set[str] = set()
    groups: List[RequirementGroupImport] = []
    i = 0
    last_course_ids: List[str] = []
    while i < len(chunks):
        chunk = chunks[i]
        lowered = chunk.lower()
        ids = sorted(extract_course_idents(chunk))

        # Skip summary rows.
        if "total credits" in lowered:
            i += 1
            continue

        # Pattern: "Choose one of the following..." then N course rows.
        if "choose" in lowered and "following" in lowered:
            option_ids: Set[str] = set()
            option_credits = credits_from_text(chunk)
            j = i + 1
            while j < len(chunks):
                nxt = chunks[j]
                nxt_lower = nxt.lower()
                nxt_ids = sorted(extract_course_idents(nxt))
                # Stop on next choose block, totals, or a non-course explanatory line.
                if "total credits" in nxt_lower or ("choose" in nxt_lower and "following" in nxt_lower):
                    break
                if not nxt_ids:
                    # Allow "or ..." bridging lines to continue, but stop on generic text rows.
                    if nxt_lower.startswith("or "):
                        j += 1
                        continue
                    break
                option_ids.update(nxt_ids)
                j += 1

            if len(option_ids) > 1:
                groups.append(
                    RequirementGroupImport(
                        name=f"{header_text} option {i + 1}",
                        satisfyingCredits=option_credits,
                        courseIdents=sorted(option_ids),
                    )
                )
            elif len(option_ids) == 1:
                direct_courses.update(option_ids)
            i = j
            last_course_ids = sorted(option_ids)
            continue

        # Pattern: line starts with "or COURSE ..."
        if lowered.startswith("or ") and ids:
            option_ids = set(ids)
            for prev in last_course_ids:
                option_ids.add(prev)
                if prev in direct_courses:
                    direct_courses.remove(prev)
            if len(option_ids) > 1:
                groups.append(
                    RequirementGroupImport(
                        name=f"{header_text} option {i + 1}",
                        satisfyingCredits=credits_from_text(chunk),
                        courseIdents=sorted(option_ids),
                    )
                )
            else:
                direct_courses.update(option_ids)
            last_course_ids = sorted(option_ids)
            i += 1
            continue

        # Default: direct row
        if ids:
            direct_courses.update(ids)
            last_course_ids = ids
        else:
            last_course_ids = []
        i += 1

    # Remove items that belong to explicit option groups from direct requirements.
    option_course_ids = {cid for g in groups for cid in g.courseIdents}
    direct_courses = {cid for cid in direct_courses if cid not in option_course_ids}

    # Deduplicate option groups by exact course set.
    deduped_groups: List[RequirementGroupImport] = []
    seen_group_keys: Set[tuple[str, ...]] = set()
    for g in groups:
        key = tuple(sorted(g.courseIdents))
        if not key or key in seen_group_keys:
            continue
        seen_group_keys.add(key)
        deduped_groups.append(g)
    groups = deduped_groups

    if not direct_courses and not groups:
        return None

    header_credits = credits_from_text(header_text)
    # Keep "Total Degree Requirement: 120 cr." accurate.
    if "total degree requirement" in header_text.lower() and header_credits > 0:
        satisfying_credits = header_credits
    else:
        satisfying_credits = header_credits

    return DegreeRequirementImport(
        name=normalized_header[:180],
        satisfyingCredits=satisfying_credits,
        courseIdents=sorted(direct_courses),
        requirementGroups=groups,
    )


def is_requirement_heading(htxt: str) -> bool:
    lowered = htxt.lower()
    keyword_match = (
        "requirement" in lowered
        or "core" in lowered
        or "elective" in lowered
        or "mathematical sciences" in lowered
        or "chemistry" in lowered
        or "physics" in lowered
        or "biology" in lowered
    )
    credit_match = bool(CREDITS_RE.search(htxt))
    return keyword_match or credit_match


def parse_major_page(
    url: str,
    html: str,
    session: requests.Session | None = None,
    approved_cache: Dict[str, Dict[str, Set[str]]] | None = None,
) -> MajorImport | None:
    soup = BeautifulSoup(html, "html.parser")
    title_el = soup.select_one("h1.page-title") or soup.select_one("h1")
    if not title_el:
        return None

    title = clean(title_el.get_text(" ", strip=True))
    major_name = title.replace("Major", "").strip(" -")
    description_el = soup.select_one("#textcontainer p") or soup.select_one("main p")
    description = clean(description_el.get_text(" ", strip=True)) if description_el else ""
    college = infer_college_from_path(url)

    requirements: List[DegreeRequirementImport] = []
    headers = soup.select("#textcontainer h2, #textcontainer h3, #textcontainer h4, #textcontainer h5, h2, h3, h4, h5")
    for header in headers:
        htxt = clean(header.get_text(" ", strip=True))
        if not is_requirement_heading(htxt):
            continue

        section_nodes = collect_section_until_next_heading(header)
        requirement = build_requirement_from_section(htxt, section_nodes)
        if requirement:
            requirements.append(requirement)

    # Fallback: some pages structure requirements without matching headings.
    if not requirements:
        main_text_el = soup.select_one("#textcontainer") or soup.select_one("main")
        main_text = clean(main_text_el.get_text(" ", strip=True)) if main_text_el else ""
        all_courses = sorted(extract_course_idents(main_text))
        if all_courses:
            requirements.append(
                DegreeRequirementImport(
                    name="Imported Curriculum Requirements",
                    satisfyingCredits=0,
                    courseIdents=all_courses,
                    requirementGroups=[],
                )
            )

    # De-duplicate by name
    unique_reqs: List[DegreeRequirementImport] = []
    seen_names = set()
    for req in requirements:
        key = normalize_heading_key(req.name)
        if key in seen_names:
            continue
        seen_names.add(key)
        unique_reqs.append(req)

    # Enrich elective-like requirements from linked approved/supplementary/technical lists.
    if session is not None:
        needs_enrichment = any(
            (
                (
                    "elective" in req.name.lower()
                    or "approved" in req.name.lower()
                    or "remaining courses" in req.name.lower()
                )
                and (len(req.courseIdents) == 0 or req.satisfyingCredits > 0)
            )
            or any(
                (
                    len(g.courseIdents) == 0
                    and (
                        "elective" in g.name.lower()
                        or "approved" in g.name.lower()
                        or "arts and humanities" in g.name.lower()
                        or "social sciences" in g.name.lower()
                    )
                )
                for g in req.requirementGroups
            )
            for req in unique_reqs
        )
        links = extract_approved_links(soup, url) if needs_enrichment else []
        if links:
            links = sorted(set(links), key=approved_link_priority)[:MAX_APPROVED_LINKS_PER_MAJOR]
            cache = approved_cache if approved_cache is not None else {}
            merged_groups: Dict[str, Set[str]] = {}
            requirement_labels: List[str] = []
            for req in unique_reqs:
                requirement_labels.append(req.name)
                for g in req.requirementGroups:
                    requirement_labels.append(g.name)
            enrich_start = time.time()
            for link in links:
                if (time.time() - enrich_start) > MAX_APPROVED_ENRICH_SECONDS:
                    break
                groups = load_approved_resource_groups(
                    session,
                    link,
                    cache,
                    requirement_labels=requirement_labels,
                )
                for group_name, ids in groups.items():
                    if not ids:
                        continue
                    merged_groups.setdefault(group_name, set()).update(ids)
            if merged_groups:
                augment_requirements_with_approved_groups(unique_reqs, merged_groups)

    return MajorImport(
        name=major_name or title,
        college=college,
        description=description,
        degreeRequirements=unique_reqs,
    )


def scrape_all_majors(catalog_year: str, delay_seconds: float, include_courses: bool) -> IsuDegreeDataset:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    index_url = urljoin(BASE, MAJORS_INDEX_PATH)
    index_html = fetch_html(session, index_url, timeout=20, retries=3)
    index_soup = BeautifulSoup(index_html, "html.parser")
    major_links = list(iter_major_links(index_soup))
    approved_resource_cache: Dict[str, Dict[str, Set[str]]] = {}

    majors: List[MajorImport] = []
    for link in major_links:
        try:
            html = fetch_html(session, link, timeout=20, retries=3)
            major = parse_major_page(link, html, session=session, approved_cache=approved_resource_cache)
            if major and major.degreeRequirements:
                majors.append(major)
            time.sleep(delay_seconds)
        except Exception:
            continue

    # Deduplicate majors by (name, college), keeping the richer entry.
    deduped: dict[tuple[str, str], MajorImport] = {}
    for major in majors:
        key = (major.name.strip().lower(), major.college.strip().upper())
        current = deduped.get(key)
        if current is None:
            deduped[key] = major
            continue
        cur_score = len(current.degreeRequirements)
        new_score = len(major.degreeRequirements)
        if new_score > cur_score:
            deduped[key] = major
    majors = list(deduped.values())

    courses = scrape_all_courses(session, delay_seconds) if include_courses else []
    course_credit_map = {c.get("courseIdent"): int(c.get("credits") or 0) for c in courses if c.get("courseIdent")}
    known_course_idents = set(course_credit_map.keys()) if course_credit_map else None
    majors = postprocess_majors(majors, course_credit_map, known_course_idents)

    return IsuDegreeDataset(
        source="Iowa State University Catalog",
        catalogYear=catalog_year,
        courses=courses,
        majors=majors,
    )


def infer_requirement_group_credits(group: RequirementGroupImport, requirement: DegreeRequirementImport,
                                    course_credit_map: Dict[str, int]) -> int:
    if group.satisfyingCredits > 0:
        return group.satisfyingCredits
    credits = [course_credit_map.get(cid, 0) for cid in group.courseIdents]
    positive = [c for c in credits if c > 0]
    if positive:
        return min(positive)
    if requirement.satisfyingCredits > 0 and len(group.courseIdents) > 1:
        # Conservative default for OR groups when course credits are unavailable.
        return 3
    return 0


def should_convert_direct_to_pool(requirement: DegreeRequirementImport, direct_course_ids: List[str],
                                  course_credit_map: Dict[str, int]) -> bool:
    if requirement.satisfyingCredits <= 0 or len(direct_course_ids) < 6:
        return False

    lowered_name = requirement.name.lower()
    likely_pool_by_name = (
        "remaining courses" in lowered_name
        or "elective" in lowered_name
        or "select from" in lowered_name
        or "choose from" in lowered_name
    )

    direct_total_credits = sum(max(0, int(course_credit_map.get(cid, 0))) for cid in direct_course_ids)
    if direct_total_credits <= 0:
        # If we cannot compute credits, still convert strongly-pool-like sections by name.
        return likely_pool_by_name

    # If direct listed credits are far above the cap, this is almost always a selectable pool.
    oversubscribed = direct_total_credits >= int(requirement.satisfyingCredits * 1.8)
    return likely_pool_by_name or oversubscribed


def postprocess_majors(
    majors: List[MajorImport],
    course_credit_map: Dict[str, int],
    known_course_idents: Set[str] | None,
) -> List[MajorImport]:
    for major in majors:
        cleaned_requirements: List[DegreeRequirementImport] = []
        for req in major.degreeRequirements:
            direct = sanitize_course_idents(req.courseIdents, known_course_idents)

            seen_group_sets: Set[tuple] = set()
            cleaned_groups: List[RequirementGroupImport] = []
            group_course_ids: Set[str] = set()
            for group in req.requirementGroups:
                group_ids = sanitize_course_idents(group.courseIdents, known_course_idents)
                group_name = strip_trailing_footnote_suffix(normalize_requirement_name(group.name))
                group_name_lower = group_name.lower()
                keep_placeholder = (
                    len(group_ids) == 0
                    and (
                        "elective" in group_name_lower
                        or "approved" in group_name_lower
                        or "arts and humanities" in group_name_lower
                        or "social sciences" in group_name_lower
                        or "approved list" in group_name_lower
                        or "approved course" in group_name_lower
                        or "open elective" in group_name_lower
                    )
                )
                if keep_placeholder:
                    key = ("PLACEHOLDER", normalize_heading_key(group_name), int(group.satisfyingCredits))
                    if key in seen_group_sets:
                        continue
                    seen_group_sets.add(key)
                    cleaned_groups.append(
                        RequirementGroupImport(
                            name=group_name[:180],
                            satisfyingCredits=max(0, int(group.satisfyingCredits or 0)),
                            courseIdents=[],
                        )
                    )
                    continue

                if len(group_ids) < 2:
                    # Single-id "group" is not a true option group; fold it back into direct list.
                    direct.extend(group_ids)
                    continue
                key = (tuple(group_ids), normalize_heading_key(group_name))
                if key in seen_group_sets:
                    continue
                seen_group_sets.add(key)
                inferred_credits = infer_requirement_group_credits(
                    RequirementGroupImport(group.name, group.satisfyingCredits, group_ids),
                    req,
                    course_credit_map,
                )
                cleaned_groups.append(
                    RequirementGroupImport(
                        name=group_name[:180] or normalize_requirement_name(req.name)[:180],
                        satisfyingCredits=inferred_credits,
                        courseIdents=group_ids,
                    )
                )
                group_course_ids.update(group_ids)

            direct = sorted(set(direct) - group_course_ids)

            normalized_req = DegreeRequirementImport(
                name=strip_trailing_footnote_suffix(normalize_requirement_name(req.name))[:180],
                satisfyingCredits=max(0, int(req.satisfyingCredits or 0)),
                courseIdents=direct,
                requirementGroups=cleaned_groups,
            )

            if should_convert_direct_to_pool(normalized_req, direct, course_credit_map):
                normalized_req.requirementGroups.append(
                    RequirementGroupImport(
                        name=f"{normalized_req.name} pool",
                        satisfyingCredits=normalized_req.satisfyingCredits,
                        courseIdents=direct,
                    )
                )
                normalized_req.courseIdents = []

            if normalized_req.courseIdents or normalized_req.requirementGroups:
                cleaned_requirements.append(normalized_req)

        # Re-dedup at requirement level after cleanup.
        unique_requirements: List[DegreeRequirementImport] = []
        seen_req_names: Set[str] = set()
        for req in cleaned_requirements:
            key = normalize_heading_key(req.name)
            if key in seen_req_names:
                continue
            seen_req_names.add(key)
            unique_requirements.append(req)
        major.degreeRequirements = unique_requirements

    return majors


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape ISU major requirement data.")
    parser.add_argument("--output", required=True, help="Output JSON file path.")
    parser.add_argument("--catalog-year", default="2026-2027", help="Catalog year label.")
    parser.add_argument("--delay-seconds", type=float, default=0.2, help="Delay between page requests.")
    parser.add_argument("--include-courses", action="store_true", help="Also scrape all courses from A-Z catalog.")
    args = parser.parse_args()

    dataset = scrape_all_majors(
        catalog_year=args.catalog_year,
        delay_seconds=args.delay_seconds,
        include_courses=args.include_courses,
    )

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(
            {
                "source": dataset.source,
                "catalogYear": dataset.catalogYear,
                "courses": dataset.courses,
                "majors": [asdict(m) for m in dataset.majors],
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    output_path = Path(args.output).resolve()
    static_dataset_path = (Path(__file__).resolve().parents[1] / "src" / "main" / "resources" / "static" / "isu-degree-dataset.json").resolve()
    did_sync_static = False
    if (
        output_path.name == "isu-degree-dataset.json"
        and output_path.parent.name.lower() == "docs"
        and static_dataset_path.parent.exists()
        and output_path != static_dataset_path
    ):
        static_dataset_path.write_bytes(output_path.read_bytes())
        did_sync_static = True

    print(f"Wrote {len(dataset.majors)} majors and {len(dataset.courses)} courses to {args.output}")
    if did_sync_static:
        print(f"Synced dataset to {static_dataset_path}")


if __name__ == "__main__":
    main()
