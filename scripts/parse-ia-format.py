#!/usr/bin/env python3
"""
Parse the IA-FORMAT-RBG.md (messy PDF table conversion) into structured JSON.

The PDF has a table with columns: Index Id | RBS Index | Functional Area | Business Risk Level
During conversion, columns got placed sequentially per page instead of side-by-side.

Each page block typically has:
  1. Column headers (repeated)
  2. Item numbers block (Index Id column)
  3. Fragment text (spillover from column splits)
  4. Risk categories block
  5. Description text block (Functional Area column - this is what we need)

We align item numbers to descriptions by processing page by page.
"""

import json
import re
import sys
from pathlib import Path
from collections import OrderedDict

AEGIS_ROOT = Path(__file__).parent.parent
IA_FORMAT = AEGIS_ROOT / "IA-FORMAT-RBG.md"
SEED_DIR = AEGIS_ROOT / "src" / "data" / "seed"

# Patterns
ITEM_NUM_PATTERN = re.compile(r'^(\d+\.\d+(?:\.\d+)*)$')
STANDALONE_NUM = re.compile(r'^\d+$')
PAGE_MARKER = re.compile(r'^Page \d+ of \d+$')
DATE_PATTERN = re.compile(r'^\d+\.\d{2}\.\d{4}$')
HEADER_WORDS = {"Index", "Id", "RBS", "Functional Area", "Business Risk", "Level"}

RISK_CATEGORIES = {
    "Operational Risk", "Credit Risk", "Market Risk", "Compliance Risk",
    "Liquidity Risk", "Strategic Risk", "Reputation Risk", "Legal Risk",
    "Interest Rate Risk", "Technology Risk", "Regulatory Risk"
}

# Area definitions: section number -> area info
AREA_DEFS = OrderedDict([
    (1, {"code": "CASH", "name": "Cash"}),
    (2, {"code": "ATM", "name": "ATM"}),
    (3, {"code": "DELIVERABLES", "name": "Deliverables Management"}),
    (4, {"code": "SECURITY_STATIONERY", "name": "Security Stationery"}),
    (5, {"code": "CLEARING", "name": "Clearing"}),
    (6, {"code": "REMITTANCES", "name": "Remittances"}),
    (7, {"code": "DEPOSITS", "name": "Deposits"}),
    (8, {"code": "GOVT_TRANSACTIONS", "name": "Government Transactions"}),
    (9, {"code": "CUSTOMER_SERVICE", "name": "Customer Service"}),
    (10, {"code": "HOUSEKEEPING", "name": "Housekeeping"}),
    (11, {"code": "LOCKERS", "name": "Lockers / Safe Deposit"}),
    (12, {"code": "KYC_AML", "name": "KYC / AML Compliance"}),
    (13, {"code": "THIRD_PARTY", "name": "Third Party Products"}),
    (14, {"code": "STAFF", "name": "Staff Accountability"}),
    (15, {"code": "GENERAL_ADMIN", "name": "General Administration"}),
    (16, {"code": "CREDIT_PRE", "name": "Credit - Pre Sanction"}),
    (17, {"code": "CREDIT_POST", "name": "Credit - Post Sanction / Monitoring"}),
    (18, {"code": "NPA", "name": "NPA Management"}),
    (19, {"code": "GOLD_LOANS", "name": "Gold Loans"}),
    (20, {"code": "PSL", "name": "Priority Sector Lending"}),
    (21, {"code": "NON_FUND", "name": "Non Fund Based Facilities"}),
    (22, {"code": "RETAIL_ASSETS", "name": "Retail Assets"}),
    (23, {"code": "INSURANCE", "name": "Insurance"}),
    (24, {"code": "PENSION", "name": "Pension"}),
    (25, {"code": "OTHER", "name": "Other Areas"}),
    (26, {"code": "FEMA", "name": "FEMA Compliance"}),
    (27, {"code": "KYC_AML_DETAILED", "name": "KYC / AML Detailed Compliance"}),
    (28, {"code": "RETAIL_LIABILITIES", "name": "Retail Liabilities"}),
    (29, {"code": "RETAIL_SERVICES", "name": "Retail Services"}),
    (30, {"code": "CREDIT_ADVANCES", "name": "Credit / Advances"}),
    (31, {"code": "INVESTMENT_TREASURY", "name": "Investment / Treasury"}),
    (32, {"code": "CREDIT_MONITORING", "name": "Credit Monitoring & Recovery"}),
    (33, {"code": "FOREX", "name": "Foreign Exchange"}),
    (34, {"code": "TRADE_FINANCE", "name": "Trade Finance"}),
    (35, {"code": "PRIORITY_SECTOR_ADV", "name": "Priority Sector Advances"}),
    (36, {"code": "GOVT_BUSINESS", "name": "Government Business"}),
    (39, {"code": "MISC", "name": "Miscellaneous"}),
])


def is_header_line(line):
    """Check if line is a column header."""
    s = line.strip()
    return s in HEADER_WORDS or s in ("", ) 


def is_risk_line(line):
    """Check if line is purely a risk category."""
    s = line.strip()
    return s in RISK_CATEGORIES


def is_item_number(line):
    """Check if line is an item number (not a date)."""
    s = line.strip()
    if DATE_PATTERN.match(s):
        return False
    return bool(ITEM_NUM_PATTERN.match(s))


def is_standalone_section(line):
    """Check if line is just a section number like '2' or '15'."""
    s = line.strip()
    if STANDALONE_NUM.match(s):
        try:
            n = int(s)
            return 1 <= n <= 50
        except:
            pass
    return False


def split_pages(lines):
    """Split document into pages based on 'Page X of Y' markers."""
    pages = []
    current_page = []
    
    for line in lines:
        if PAGE_MARKER.match(line.strip()):
            if current_page:
                pages.append(current_page)
            current_page = []
        else:
            current_page.append(line)
    
    if current_page:
        pages.append(current_page)
    
    return pages


def classify_line(line):
    """Classify a line's type."""
    s = line.strip()
    if not s:
        return "empty"
    if s in HEADER_WORDS:
        return "header"
    if is_risk_line(line):
        return "risk"
    if is_standalone_section(line):
        return "section_num"
    if is_item_number(line):
        return "item_num"
    return "text"


def extract_page_items(page_lines):
    """
    Extract item numbers and description texts from a page.
    Returns list of (item_number, [text_lines]) pairs.
    
    Strategy: Find runs of item numbers, then find the description text block
    that follows. Align them by order.
    """
    # Classify all lines
    classified = [(classify_line(l), l.strip()) for l in page_lines]
    
    # Find item number runs
    item_numbers = []
    for typ, content in classified:
        if typ == "item_num":
            item_numbers.append(content)
        elif typ == "section_num":
            pass  # Skip standalone section numbers (area headers)
    
    # Find description text runs
    # Descriptions come AFTER the item numbers + risk categories blocks
    # They're the "text" classified lines that form meaningful sentences
    text_lines = []
    in_text_block = False
    risk_count = 0
    item_count = 0
    
    for i, (typ, content) in enumerate(classified):
        if typ == "item_num" or typ == "section_num":
            item_count += 1
        elif typ == "risk":
            risk_count += 1
        elif typ == "text" and content:
            text_lines.append((i, content))
    
    return item_numbers, text_lines


def group_descriptions(text_lines, num_items):
    """
    Group text lines into descriptions for each item.
    This is the hardest part - multi-line descriptions need to be merged.
    
    Heuristic: A new description starts when:
    - The text looks like a short header/label (area names, sub-section headers)
    - After we've accumulated enough text for the current item
    """
    if not text_lines or not num_items:
        return []
    
    descriptions = []
    current_desc = []
    
    for _, text in text_lines:
        current_desc.append(text)
    
    # For now, return all text joined - we'll do smarter grouping in pass 2
    return [' '.join(d for _, d in text_lines)]


def parse_with_llm_alignment():
    """
    Alternative approach: Extract all item numbers from the full document,
    then try to find their descriptions using proximity and context.
    """
    text = IA_FORMAT.read_text(encoding='utf-8')
    lines = text.splitlines()
    
    # PASS 1: Extract ALL item numbers in order with their line numbers
    all_items = []
    for i, line in enumerate(lines):
        s = line.strip()
        if is_item_number(line) and not DATE_PATTERN.match(s):
            all_items.append({"num": s, "line": i})
    
    print(f"Pass 1: Found {len(all_items)} item numbers")
    
    # PASS 2: For each page, find the text block and try to align
    pages = split_pages(lines)
    
    # Build a global map of item_number -> description
    item_desc_map = {}
    
    for page_idx, page in enumerate(pages):
        page_items = []
        page_risks = []
        page_texts = []
        
        for local_idx, line in enumerate(page):
            s = line.strip()
            if not s:
                continue
            if s in HEADER_WORDS or PAGE_MARKER.match(s):
                continue
            
            if is_item_number(line) and not DATE_PATTERN.match(s):
                page_items.append(s)
            elif is_risk_line(line):
                page_risks.append(s)
            elif is_standalone_section(line):
                pass  # Skip
            else:
                page_texts.append(s)
        
        if not page_items or not page_texts:
            continue
        
        # The text block contains descriptions that correspond to items
        # But texts also contain spillover fragments from column splitting
        # Key insight: the MAIN descriptions are coherent text about audit procedures
        # Fragments are short orphan words like "by", "refer", "branch", "(Please", etc.
        
        # Filter out likely fragments (very short isolated words that aren't meaningful)
        # But keep short lines that are area names or clear labels
        meaningful_texts = []
        for t in page_texts:
            # Skip very short fragments that are column spillover
            if len(t) <= 3 and t.lower() in ('by', 'to', 'of', 'and', 'the', 'or', 'is', 'on', 'in', 'a', '/'):
                continue
            meaningful_texts.append(t)
        
        # Now try to align items to texts
        # The descriptions appear in the same order as items
        # Multi-line descriptions need to be grouped
        
        if len(meaningful_texts) == 0:
            continue
            
        # Strategy: Build description groups
        # A new item's description starts when we see a text that looks like 
        # it's starting a new topic (short, capitalized, or matches known area names)
        
        desc_groups = _group_texts_to_items(page_items, meaningful_texts, page_idx)
        
        for item_num, desc in desc_groups:
            if desc and item_num not in item_desc_map:
                item_desc_map[item_num] = desc
    
    return item_desc_map


def _group_texts_to_items(items, texts, page_idx):
    """
    Align text descriptions to item numbers.
    
    This is inherently approximate due to the messy format.
    We use several heuristics:
    1. Short texts that look like section headers start new items
    2. Multi-line descriptions are joined until the next header
    3. If there are more items than logical text groups, some items 
       share descriptions with their parent
    """
    results = []
    
    if not items or not texts:
        return results
    
    # Simple approach: try to find natural break points in texts
    # Break points are lines that look like new topics/headers:
    # - Known area names
    # - Short lines (< 40 chars) that start with a capital letter
    # - Lines containing specific patterns
    
    AREA_NAMES = {a["name"].lower() for a in AREA_DEFS.values()}
    AREA_NAMES.update({
        "atm", "cash", "clearing", "remittances", "deposits", 
        "government transactions", "customer service", "housekeeping",
        "lockers", "insurance", "pension", "npa management",
        "gold loans", "staff matters", "security stationery",
        "deliverables management", "retail liabilities", "retail services",
        "fema compliance", "depository services", "third party products",
        "cash management services", "government business", "branch atm",
        "off-site atms", "others (both for branch/off-site atms)",
        "record for destroyed inventory", "key maintenance",
        "cash remittance procedure", "inward cash remittance",
        "outward cash remittance", "physical verification",
        "clearing (done by ccu)", "clearing (done by the branch)",
    })
    
    # Group texts into description blocks
    blocks = []
    current_block = []
    
    for t in texts:
        t_lower = t.lower().strip('."()[]')
        
        # Check if this starts a new block
        is_new_block = False
        
        if t_lower in AREA_NAMES:
            is_new_block = True
        elif len(t) < 50 and t[0].isupper() and not t.startswith('('):
            # Short capitalized line - likely a new item header
            # But not if it starts with parens (continuation)
            is_new_block = True
        
        if is_new_block and current_block:
            blocks.append(' '.join(current_block))
            current_block = [t]
        else:
            current_block.append(t)
    
    if current_block:
        blocks.append(' '.join(current_block))
    
    # Now align blocks to items
    # If we have more items than blocks, some items are sub-items without 
    # their own description (inherit from parent)
    # If we have more blocks than items, some blocks are continuations
    
    for i, item in enumerate(items):
        if i < len(blocks):
            results.append((item, clean_text(blocks[i])))
        else:
            # Sub-item without own description - use a placeholder
            results.append((item, ""))
    
    return results


def clean_text(text):
    """Clean up multi-line text artifacts."""
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.strip('"').strip()
    # Remove trailing "Id" artifacts
    text = re.sub(r'\s+Id$', '', text)
    return text


def get_area(section_num):
    """Get area definition for a section number."""
    return AREA_DEFS.get(section_num, {"code": f"SEC_{section_num}", "name": f"Section {section_num}"})


def build_output(item_desc_map):
    """Build the final JSON structures."""
    # Sort items by their numeric value
    def sort_key(item_num):
        parts = item_num.split('.')
        return tuple(int(p) for p in parts)
    
    sorted_items = sorted(item_desc_map.keys(), key=sort_key)
    
    # Group by section
    section_items = OrderedDict()
    for item_num in sorted_items:
        sec = int(item_num.split('.')[0])
        if sec not in section_items:
            section_items[sec] = []
        section_items[sec].append({
            "itemNumber": item_num,
            "text": item_desc_map[item_num],
        })
    
    # Build areas
    areas = []
    items_output = []
    display_order = 0
    
    for area_idx, (sec_num, items) in enumerate(section_items.items(), 1):
        area_def = get_area(sec_num)
        
        area = {
            "code": area_def["code"],
            "name": area_def["name"],
            "displayOrder": area_idx,
            "sectionNumber": sec_num,
            "itemCount": len(items),
        }
        areas.append(area)
        
        for item in items:
            display_order += 1
            items_output.append({
                "areaCode": str(sec_num),
                "areaName": area_def["name"],
                "itemNumber": item["itemNumber"],
                "particulars": item["text"],
                "riskCategory": "Operational Risk",  # Default, most items are operational
                "regulatoryReference": None,
                "displayOrder": display_order,
            })
    
    return areas, items_output


def main():
    print(f"Parsing: {IA_FORMAT}")
    print(f"Document: {IA_FORMAT.stat().st_size} bytes, {len(IA_FORMAT.read_text().splitlines())} lines")
    print()
    
    # Parse using page-aligned approach
    item_desc_map = parse_with_llm_alignment()
    
    print(f"\nExtracted {len(item_desc_map)} items with descriptions")
    
    # Filter out items with empty descriptions
    with_desc = {k: v for k, v in item_desc_map.items() if v}
    without_desc = {k: v for k, v in item_desc_map.items() if not v}
    print(f"  With descriptions: {len(with_desc)}")
    print(f"  Without descriptions: {len(without_desc)}")
    
    if without_desc:
        print(f"  Missing descriptions for: {sorted(without_desc.keys(), key=lambda x: tuple(int(p) for p in x.split('.')))[:20]}...")
    
    # Build output using items WITH descriptions
    areas, items_output = build_output(with_desc)
    
    # Stats
    print(f"\nOutput: {len(areas)} areas, {len(items_output)} items")
    for area in areas:
        print(f"  {area['sectionNumber']:>2}. {area['name'][:35]:35} ({area['itemCount']} items)")
    
    # Write
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    
    areas_path = SEED_DIR / "examination-areas.json"
    items_path = SEED_DIR / "examination-items.json"
    
    with open(areas_path, 'w') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {areas_path}")
    
    with open(items_path, 'w') as f:
        json.dump(items_output, f, indent=2, ensure_ascii=False)
    print(f"Wrote {items_path}")
    
    # Validation
    print("\n=== VALIDATION ===")
    short = [i for i in items_output if len(i["particulars"]) < 10]
    if short:
        print(f"SHORT (<10 chars): {len(short)} items")
        for s in short[:10]:
            print(f"  {s['itemNumber']}: '{s['particulars']}'")
    
    long_items = [i for i in items_output if len(i["particulars"]) > 500]
    print(f"LONG (>500 chars): {len(long_items)} items")
    
    # Sample output
    print("\n=== SAMPLE (first 5 items) ===")
    for item in items_output[:5]:
        print(f"  {item['itemNumber']:>8}: {item['particulars'][:80]}...")


if __name__ == "__main__":
    main()
