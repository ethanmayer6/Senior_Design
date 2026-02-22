"""
Scrape Iowa State catalog data for majors + degree requirements (+ optionally all courses)
and emit CourseFlow's IsuDegreeDataset JSON format.

Usage:
  python webscraper/isu_degree_scraper.py --output docs/isu-degree-dataset.json --catalog-year 2026-2027 --include-courses
"""

from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass, asdict
from typing import Iterable, List, Set
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag


BASE = "https://catalog.iastate.edu"
MAJORS_INDEX_PATH = "/collegescurricula/"
USER_AGENT = "CourseFlow-ISU-Scraper/1.0 (+https://github.com/)"

COURSE_IDENT_RE = re.compile(r"\b([A-Z]{2,5})\s+(\d{3,4}[A-Z]?)\b")
CREDITS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:credits?|cr\.?)", re.IGNORECASE)
OPTION_HINT_RE = re.compile(r"\b(one of|choose|or)\b", re.IGNORECASE)


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


def extract_course_idents(text: str) -> Set[str]:
    result: Set[str] = set()
    for match in COURSE_IDENT_RE.finditer(text or ""):
        dept, num = match.group(1), match.group(2)
        result.add(f"{dept}_{num}")
    return result


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
    - "Required."
    - "Variable."
    """
    if not value:
        return 0
    m = re.search(r"\d+", value)
    return int(m.group(0)) if m else 0


def fetch_html(session: requests.Session, url: str) -> str:
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


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
    az_index_html = fetch_html(session, az_index_url)
    az_soup = BeautifulSoup(az_index_html, "html.parser")
    subject_links = list(iter_az_subject_links(az_soup))

    by_ident: dict[str, dict] = {}
    for subject_url in subject_links:
        try:
            html = fetch_html(session, subject_url)
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
    pending_or = False
    last_direct_ident: str | None = None

    def flush_option_group() -> None:
        nonlocal option_ids, option_credits, option_index, option_mode
        if len(option_ids) > 1:
            groups.append(
                RequirementGroupImport(
                    name=f"{header_text} option {option_index}",
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

    for table in tables:
        for tr in table.select("tr"):
            comment_el = tr.select_one("span.courselistcomment")
            comment_text = clean(comment_el.get_text(" ", strip=True)) if comment_el else ""
            comment_lower = comment_text.lower()

            if "choose" in comment_lower and "following" in comment_lower:
                flush_option_group()
                hours_td = tr.select_one("td.hourscol")
                option_credits = credits_from_text(clean(hours_td.get_text(" ", strip=True)) if hours_td else "")
                option_ids = set()
                option_mode = True
                continue

            if comment_lower.startswith("or"):
                pending_or = True
                continue

            code_link = tr.select_one("td.codecol a.code")
            if not code_link:
                # Non-course row.
                if "total credits" in comment_lower:
                    flush_option_group()
                continue

            ident = to_ident(code_link.get_text(" ", strip=True))
            if not ident:
                continue
            row_text = clean(tr.get_text(" ", strip=True)).lower()
            if row_text.startswith("or "):
                pending_or = True

            is_indented = tr.select_one("td.codecol div[style*='margin-left']") is not None
            if option_mode:
                if is_indented:
                    option_ids.add(ident)
                else:
                    # option block ended; this row is direct
                    flush_option_group()
                    direct_courses.add(ident)
                    last_direct_ident = ident
            else:
                if pending_or and last_direct_ident:
                    group_pair = sorted({last_direct_ident, ident})
                    if len(group_pair) > 1:
                        if last_direct_ident in direct_courses:
                            direct_courses.remove(last_direct_ident)
                        groups.append(
                            RequirementGroupImport(
                                name=f"{header_text} option {option_index}",
                                satisfyingCredits=0,
                                courseIdents=group_pair,
                            )
                        )
                        option_index += 1
                        pending_or = False
                        last_direct_ident = None
                    else:
                        direct_courses.add(ident)
                        last_direct_ident = ident
                        pending_or = False
                else:
                    direct_courses.add(ident)
                    last_direct_ident = ident

    flush_option_group()

    # Merge duplicate option groups.
    deduped_groups: List[RequirementGroupImport] = []
    seen_keys: Set[tuple[str, ...]] = set()
    for g in groups:
        key = tuple(sorted(g.courseIdents))
        if not key or key in seen_keys:
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


def parse_major_page(url: str, html: str) -> MajorImport | None:
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
    index_html = fetch_html(session, index_url)
    index_soup = BeautifulSoup(index_html, "html.parser")
    major_links = list(iter_major_links(index_soup))

    majors: List[MajorImport] = []
    for link in major_links:
        try:
            html = fetch_html(session, link)
            major = parse_major_page(link, html)
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

    return IsuDegreeDataset(
        source="Iowa State University Catalog",
        catalogYear=catalog_year,
        courses=courses,
        majors=majors,
    )


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

    print(f"Wrote {len(dataset.majors)} majors and {len(dataset.courses)} courses to {args.output}")


if __name__ == "__main__":
    main()
