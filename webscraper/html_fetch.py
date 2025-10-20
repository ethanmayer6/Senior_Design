import requests
import time, sys, argparse
from typing import List, Dict, Optional, Tuple
from bs4 import BeautifulSoup, NavigableString, Tag
import re
import json, os
import csv


WS = re.compile(r"\s+")
NBSP = u"\xa0"

def clean(s: str | None) -> str:
    if not s:
        return ""
    return WS.sub(" ", s.replace(NBSP, " ")).strip()

def text_after_label(p_tag: Tag, label_text: str) -> str:
    """
    In a paragraph like:
      <p class="credits">( Dual-listed ... ). <span class="label">Credits: </span>3. <span class="label">Contact Hours: </span>Lecture 3.</p>
    return the text content that follows the label span (e.g., "3." for Credits).
    """
    if not p_tag:
        return ""
    lbl = p_tag.find("span", class_="label", string=lambda t: t and t.strip().startswith(label_text))
    parts = []
    if lbl:
        for sib in lbl.next_siblings:
            # stop when we hit the next label
            if isinstance(sib, Tag) and sib.name == "span" and "label" in sib.get("class", []):
                break
            parts.append(sib.get_text(" ", strip=True) if isinstance(sib, Tag) else str(sib))
    return clean(" ".join(parts))

def parse_credits_block(credits_p: Optional[Tag]) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str], Optional[bool]]:
    cross_listed = None
    dual_listed = None
    credits = None
    contact_hours = None
    repeatable = None

    if credits_p:
        credits = text_after_label(credits_p, "Credits:")
        contact_hours = text_after_label(credits_p, "Contact Hours:")

        # Leading parenthetical chunks before any labels may include cross/dual-listed and repeatable notes
        leading_bits = []
        for child in credits_p.children:
            if isinstance(child, Tag) and child.name == "span" and "label" in child.get("class", []):
                break
            txt = clean(child.get_text(" ", strip=True) if isinstance(child, Tag) else str(child))
            if txt:
                leading_bits.append(txt)
        leading = clean(" ".join(leading_bits))

        for p in re.findall(r"\(([^)]+)\)", leading):
            t = clean(p)
            tl = t.lower()
            if tl.startswith("dual-listed"):
                dual_listed = t
            elif tl.startswith("cross-listed"):
                cross_listed = t
            elif "repeatable" in tl:
                repeatable = True

        # Also detect “Repeatable, maximum of X credits.” pattern that sometimes appears after labels
        tail_text = clean(credits_p.get_text(" ", strip=True))
        if re.search(r"\brepeatable\b", tail_text, flags=re.I):
            repeatable = True

    return cross_listed or None, dual_listed or None, (clean(credits) or None), (clean(contact_hours) or None), repeatable


def parse_prereq_block(pr_p: Tag):
    """
    Parse the combined prereq/description/typically-offered paragraph robustly.

    Returns: (prerequisites, description, typically_offered)
    """
    prerequisites = None
    description = None
    typically_offered = None

    if not pr_p:
        return None, None, None

    # Raw full text from the paragraph (labels, parens, etc.)
    full_text = clean(pr_p.get_text(" ", strip=True))

    # 1) Extract prerequisites only from <em>…</em>
    em = pr_p.find("em")
    em_text = None
    if em:
        em_text = clean(em.get_text(" ", strip=True))
        prerequisites = clean(re.sub(r"^Prereq:\s*", "", em_text, flags=re.I)) or None

    # 2) Pull "Typically Offered" no matter how it's written:
    #    - "( Typically Offered: Fall, Spring, Summer)"
    #    - "Typically Offered: Fall (even-numbered years), ..."
    m_typ = re.search(r"\bTypically Offered:\s*(.*)$", full_text, flags=re.I)
    if m_typ:
        # Everything after the label
        typ_tail = m_typ.group(1)
        # Strip common wrappers like trailing ')' and '.' and leading '('
        typically_offered = clean(typ_tail.strip().strip("(). "))

    # 3) Description = full_text minus prereq piece and minus the "Typically Offered" tail.
    desc_text = full_text
    if m_typ:
        # remove the "Typically Offered: …" suffix entirely
        desc_text = desc_text[:m_typ.start()].rstrip()

    if em_text:
        # remove the prereq segment wherever it appears
        # handle both with/without "Prereq:" prefix
        desc_text = re.sub(re.escape(em_text), "", desc_text).strip()
        desc_text = re.sub(r"^Prereq:\s*", "", desc_text, flags=re.I).strip()

    # If there was a dangling "(" before the Typically Offered parenthetical, trim it
    desc_text = desc_text.rstrip(" (").rstrip(",;")

    # Collapse whitespace and finalize
    description = clean(desc_text) or None

    return prerequisites, description, typically_offered


TITLE_RE = re.compile(r"^\s*([A-Z& ]+)\s+(\d+[A-Z]?)\s*:\s*(.+?)\s*$")

def split_title_fields(title_text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Return (subject_code, course_number, title_name), best effort.
    """
    m = TITLE_RE.match(title_text)
    if not m:
        return None, None, title_text or None
    subj = clean(m.group(1))
    num = clean(m.group(2))
    name = clean(m.group(3))
    # Normalize subject like "A E" -> "AE" if the site uses spaced codes; otherwise leave as-is
    subj_norm = subj.replace(" ", "")
    return subj_norm, num, name
def parse_courseblock(block: Tag, source_url: str | None = None) -> Dict:
    title_div = block.find("div", class_="courseblocktitle")
    strong = title_div.find("strong") if title_div else None
    title = clean(strong.get_text(" ", strip=True) if strong else title_div.get_text(" ", strip=True) if title_div else "")

    desc_div = block.find("div", class_="courseblockdesc")
    credits_p = desc_div.find("p", class_="credits") if desc_div else None
    prereq_p  = desc_div.find("p", class_="prereq")  if desc_div else None

    cross_listed, dual_listed, credits, contact_hours, repeatable = parse_credits_block(credits_p)
    prerequisites, description, typically_offered = parse_prereq_block(prereq_p)

    subject_code, course_number, title_name = split_title_fields(title)

    malformed = not(subject_code and course_number)

    return {
        "title_raw": title or None,
        "subject_code": subject_code,
        "course_number": course_number,
        "title_name": title_name,
        "credits": credits,
        "contact_hours": contact_hours,
        "cross_listed": cross_listed,
        "dual_listed": dual_listed,
        "repeatable": repeatable,
        "prerequisites": prerequisites,
        "description": description,
        "typically_offered": typically_offered,
        "source_url": source_url,
        "malformed_title": malformed or None
    }
def parse_catalog_html(html: str, source_url: str | None = None):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for block in soup.find_all("div", class_="courseblock"):
        course = parse_courseblock(block, source_url=source_url)
        out.append(course)
    return out

def split_courses(html: str, source_url: str | None = None):
    # kept for compatibility with your current call sites
    return parse_catalog_html(html, source_url)

def get_raw_html(url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; ISU-Catalog-Scraper/1.0)"
        }
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Error fetching the page: {e}")

def write_courses_to_csv(course_objects):
    print("start")

def create_course_objects(html):
    
    soup = BeautifulSoup(html, "html.parser")
    courses = []

    
    for block in soup.find_all("div", class_="courseblock"):
        title_tag = block.find("div", class_="courseblocktitle")
        desc_tag = block.find("div", class_="courseblockdesc")

        
        title = title_tag.get_text(strip=True) if title_tag else "N/A"

        
        description = desc_tag.get_text(" ", strip=True) if desc_tag else "N/A"

        
        credits = "N/A"
        prereq = "N/A"
        if desc_tag:
            credits_tag = desc_tag.find("p", class_="credits")
            prereq_tag = desc_tag.find("p", class_="prereq")
            if credits_tag:
                credits = credits_tag.get_text(" ", strip=True)
            if prereq_tag:
                prereq = prereq_tag.get_text(" ", strip=True)

        courses.append({
            "title": title,
            "credits": credits,
            "prerequisites": prereq,
            "description": description
        })

    return courses

def query_html_by_url():
    
    major_urls = [
        
    ]

    for url in major_urls:
        html = get_raw_html(url)
        course_objects = create_course_objects(html)
        write_courses_to_csv(course_objects)
    
def csv_writer(course: dict, filename: str):
    """Write a single course dictionary to a CSV file."""
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    cols = [
        "subject_code", "course_number", "title_name", "credits",
        "contact_hours", "cross_listed", "dual_listed", "repeatable",
        "prerequisites", "description", "typically_offered", "source_url"
    ]
    file_exists = os.path.exists(filename)
    
    if(file_exists):
        with open(filename, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writerow({k: course.get(k, "") for k in cols})
    else:
        with open(filename, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerow({k: course.get(k, "") for k in cols})
        
    print(f"✅ Wrote {filename}")
    

urls = [
    "https://catalog.iastate.edu/azcourses/acct/",
    "https://catalog.iastate.edu/azcourses/actuarialscience/",
    "https://catalog.iastate.edu/azcourses/advrt/",
    "https://catalog.iastate.edu/azcourses/aer_e/",
    "https://catalog.iastate.edu/azcourses/af_am/",
    "https://catalog.iastate.edu/azcourses/abe/",
    "https://catalog.iastate.edu/azcourses/ageds/",
    "https://catalog.iastate.edu/azcourses/agron/",
    "https://catalog.iastate.edu/azcourses/afas/",
    "https://catalog.iastate.edu/azcourses/am_in/",
    "https://catalog.iastate.edu/azcourses/asl/",
    "https://catalog.iastate.edu/azcourses/an_s/",
    "https://catalog.iastate.edu/azcourses/anthr/",
    "https://catalog.iastate.edu/azcourses/aeshm/",
    "https://catalog.iastate.edu/azcourses/a_m_d/",
    "https://catalog.iastate.edu/azcourses/arabc/",
    "https://catalog.iastate.edu/azcourses/arch/",
    "https://catalog.iastate.edu/azcourses/art/",
    "https://catalog.iastate.edu/azcourses/arted/",
    "https://catalog.iastate.edu/azcourses/art_h/",
    "https://catalog.iastate.edu/azcourses/ai/",
    "https://catalog.iastate.edu/azcourses/astro/",
    "https://catalog.iastate.edu/azcourses/ath/",
    "https://catalog.iastate.edu/azcourses/a_tr/",
    "https://catalog.iastate.edu/azcourses/bbmb/",
    "https://catalog.iastate.edu/azcourses/bcb/",
    "https://catalog.iastate.edu/azcourses/bcbio/",
    "https://catalog.iastate.edu/azcourses/biol/",
    "https://catalog.iastate.edu/azcourses/bme/",
    "https://catalog.iastate.edu/azcourses/b_m_s/",
    "https://catalog.iastate.edu/azcourses/busad/",
    "https://catalog.iastate.edu/azcourses/ch_e/",
    "https://catalog.iastate.edu/azcourses/chem/",
    "https://catalog.iastate.edu/azcourses/chin/",
    "https://catalog.iastate.edu/azcourses/c_e/",
    "https://catalog.iastate.edu/azcourses/cl_st/",
    "https://catalog.iastate.edu/azcourses/clsci/",
    "https://catalog.iastate.edu/azcourses/comst/",
    "https://catalog.iastate.edu/azcourses/c_r_p/",
    "https://catalog.iastate.edu/azcourses/comdv/",
    "https://catalog.iastate.edu/azcourses/c_dev/",
    "https://catalog.iastate.edu/azcourses/cpr_e/",
    "https://catalog.iastate.edu/azcourses/com_s/",
    "https://catalog.iastate.edu/azcourses/con_e/",
    "https://catalog.iastate.edu/azcourses/criminaljustice/",
    "https://catalog.iastate.edu/azcourses/cybersecurity/",
    "https://catalog.iastate.edu/azcourses/cybersecurityengineering/",
    "https://catalog.iastate.edu/azcourses/dance/",
    "https://catalog.iastate.edu/azcourses/datascience/",
    "https://catalog.iastate.edu/azcourses/des/",
    "https://catalog.iastate.edu/azcourses/dsn_s/",
    "https://catalog.iastate.edu/azcourses/diet/",
    "https://catalog.iastate.edu/azcourses/dh/",
    "https://catalog.iastate.edu/azcourses/ecp/",
    "https://catalog.iastate.edu/azcourses/ecfp/",
    "https://catalog.iastate.edu/azcourses/eeb/",
    "https://catalog.iastate.edu/azcourses/eeob/",
    "https://catalog.iastate.edu/azcourses/econ/",
    "https://catalog.iastate.edu/azcourses/edadm/",
    "https://catalog.iastate.edu/azcourses/el_ps/",
    "https://catalog.iastate.edu/azcourses/education/",
    "https://catalog.iastate.edu/azcourses/e_e/",
    "https://catalog.iastate.edu/azcourses/engr/",
    "https://catalog.iastate.edu/azcourses/e_m/",
    "https://catalog.iastate.edu/azcourses/engl/",
    "https://catalog.iastate.edu/azcourses/ent/",
    "https://catalog.iastate.edu/azcourses/entsp/",
    "https://catalog.iastate.edu/azcourses/env_e/",
    "https://catalog.iastate.edu/azcourses/ensci/",
    "https://catalog.iastate.edu/azcourses/env_s/",
    "https://catalog.iastate.edu/azcourses/event/",
    "https://catalog.iastate.edu/azcourses/fceds/",
    "https://catalog.iastate.edu/azcourses/ffp/",
    "https://catalog.iastate.edu/azcourses/fdm/",
    "https://catalog.iastate.edu/azcourses/fin/",
    "https://catalog.iastate.edu/azcourses/fs_hn/",
    "https://catalog.iastate.edu/azcourses/for/",
    "https://catalog.iastate.edu/azcourses/frnch/",
    "https://catalog.iastate.edu/azcourses/game/",
    "https://catalog.iastate.edu/azcourses/gdcb/",
    "https://catalog.iastate.edu/azcourses/gen/",
    "https://catalog.iastate.edu/azcourses/genet/",
    "https://catalog.iastate.edu/azcourses/geol/",
    "https://catalog.iastate.edu/azcourses/ger/",
    "https://catalog.iastate.edu/azcourses/geron/",
    "https://catalog.iastate.edu/azcourses/globe/",
    "https://catalog.iastate.edu/azcourses/gr_st/",
    "https://catalog.iastate.edu/azcourses/artgr/",
    "https://catalog.iastate.edu/azcourses/hhsci/",
    "https://catalog.iastate.edu/azcourses/hcm/",
    "https://catalog.iastate.edu/azcourses/h_s/",
    "https://catalog.iastate.edu/azcourses/hg_ed/",
    "https://catalog.iastate.edu/azcourses/hist/",
    "https://catalog.iastate.edu/azcourses/hon/",
    "https://catalog.iastate.edu/azcourses/hort/",
    "https://catalog.iastate.edu/azcourses/hsp_m/",
    "https://catalog.iastate.edu/azcourses/hci/",
    "https://catalog.iastate.edu/azcourses/hd_fs/",
    "https://catalog.iastate.edu/azcourses/imbio/",
    "https://catalog.iastate.edu/azcourses/ind_d/",
    "https://catalog.iastate.edu/azcourses/i_e/",
    "https://catalog.iastate.edu/azcourses/ihs/",
    "https://catalog.iastate.edu/azcourses/igs/",
    "https://catalog.iastate.edu/azcourses/artid/",
    "https://catalog.iastate.edu/azcourses/intst/",
    "https://catalog.iastate.edu/azcourses/ia_ll/",
    "https://catalog.iastate.edu/azcourses/italian/",
    "https://catalog.iastate.edu/azcourses/jl_mc/",
    "https://catalog.iastate.edu/azcourses/kin/",
    "https://catalog.iastate.edu/azcourses/l_a/",
    "https://catalog.iastate.edu/azcourses/latin/",
    "https://catalog.iastate.edu/azcourses/ld_st/",
    "https://catalog.iastate.edu/azcourses/lls/",
    "https://catalog.iastate.edu/azcourses/las/",
    "https://catalog.iastate.edu/azcourses/lib/",
    "https://catalog.iastate.edu/azcourses/ling/",
    "https://catalog.iastate.edu/azcourses/mis/",
    "https://catalog.iastate.edu/azcourses/mgmt/",
    "https://catalog.iastate.edu/azcourses/mkt/",
    "https://catalog.iastate.edu/azcourses/mat_e/",
    "https://catalog.iastate.edu/azcourses/m_s_e/",
    "https://catalog.iastate.edu/azcourses/math/",
    "https://catalog.iastate.edu/azcourses/m_e/",
    "https://catalog.iastate.edu/azcourses/mteor/",
    "https://catalog.iastate.edu/azcourses/micro/",
    "https://catalog.iastate.edu/azcourses/m_s/",
    "https://catalog.iastate.edu/azcourses/mcdb/",
    "https://catalog.iastate.edu/azcourses/music/",
    "https://catalog.iastate.edu/azcourses/nrem/",
    "https://catalog.iastate.edu/azcourses/n_s/",
    "https://catalog.iastate.edu/azcourses/neuro/",
    "https://catalog.iastate.edu/azcourses/nursing/",
    "https://catalog.iastate.edu/azcourses/nutrs/",
    "https://catalog.iastate.edu/azcourses/ots/",
    "https://catalog.iastate.edu/azcourses/perf/",
    "https://catalog.iastate.edu/azcourses/phil/",
    "https://catalog.iastate.edu/azcourses/phys/",
    "https://catalog.iastate.edu/azcourses/plbio/",
    "https://catalog.iastate.edu/azcourses/pl_p/",
    "https://catalog.iastate.edu/azcourses/pol_s/",
    "https://catalog.iastate.edu/azcourses/port/",
    "https://catalog.iastate.edu/azcourses/psych/",
    "https://catalog.iastate.edu/azcourses/publicrelations/",
    "https://catalog.iastate.edu/azcourses/relig/",
    "https://catalog.iastate.edu/azcourses/resev/",
    "https://catalog.iastate.edu/azcourses/rus/",
    "https://catalog.iastate.edu/azcourses/bpm_i/",
    "https://catalog.iastate.edu/azcourses/stb/",
    "https://catalog.iastate.edu/azcourses/soc/",
    "https://catalog.iastate.edu/azcourses/s_e/",
    "https://catalog.iastate.edu/azcourses/span/",
    "https://catalog.iastate.edu/azcourses/sp_ed/",
    "https://catalog.iastate.edu/azcourses/sp_cm/",
    "https://catalog.iastate.edu/azcourses/sportsmediaandcommunication/",
    "https://catalog.iastate.edu/azcourses/stat/",
    "https://catalog.iastate.edu/azcourses/scm/",
    "https://catalog.iastate.edu/azcourses/susag/",
    "https://catalog.iastate.edu/azcourses/sustainableenvironments/",
    "https://catalog.iastate.edu/azcourses/tsm/",
    "https://catalog.iastate.edu/azcourses/thtre/",
    "https://catalog.iastate.edu/azcourses/tox/",
    "https://catalog.iastate.edu/azcourses/trans/",
    "https://catalog.iastate.edu/azcourses/u_st/",
    "https://catalog.iastate.edu/azcourses/urbandesign/",
    "https://catalog.iastate.edu/azcourses/uxd/",
    "https://catalog.iastate.edu/azcourses/us_ls/",
    "https://catalog.iastate.edu/azcourses/v_c_s/",
    "https://catalog.iastate.edu/azcourses/vdpam/",
    "https://catalog.iastate.edu/azcourses/v_mpm/",
    "https://catalog.iastate.edu/azcourses/v_pth/",
    "https://catalog.iastate.edu/azcourses/wfce/",
    "https://catalog.iastate.edu/azcourses/wesep/",
    "https://catalog.iastate.edu/azcourses/wise/",
    "https://catalog.iastate.edu/azcourses/wgs/",
    "https://catalog.iastate.edu/azcourses/worldfilmstudies/",
    "https://catalog.iastate.edu/azcourses/wlc/",
    "https://catalog.iastate.edu/azcourses/yth/",

]


for url in urls:
    
    courses = split_courses(get_raw_html(url), source_url=url)
    print(courses)
    for c in courses:
        
        #print(json.dumps(c, indent=2, ensure_ascii=False))
        name = c.get("subject_code")
        csv_writer(c, f"courses_csv/{name}.csv")
