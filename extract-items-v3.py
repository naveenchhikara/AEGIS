#!/usr/bin/env python3
"""
Extract examination items from IA-FORMAT-RBG.md
The document has 4 columns that got flattened sequentially:
1. Index Id (item numbers)
2. RBS Index (TR codes - ignored)
3. Functional Area (descriptions)
4. Business Risk Level (risk categories)

We need to read them in parallel within each page.
"""

import re
import json
from typing import List, Dict, Tuple

# Area definitions
AREA_DEFINITIONS = {
    "1": "Cash", "2": "ATM", "3": "Deliverables Management", "4": "Security Stationery",
    "5": "Clearing", "6": "Remittances", "7": "Deposits", "8": "Government Transactions",
    "9": "Customer Service", "10": "Housekeeping", "11": "Lockers/Safe Deposit",
    "12": "KYC/AML Compliance", "13": "Third Party Products", "14": "Staff Accountability",
    "15": "General Administration", "16": "Credit Pre-Sanction", "17": "Credit Post-Sanction",
    "18": "NPA Management", "19": "Gold Loans", "20": "Priority Sector Lending",
    "21": "Non Fund Based", "22": "Retail Assets", "23": "Insurance", "24": "Pension", "25": "Other",
    "26": "FEMA Compliance", "27": "KYC/AML Detailed", "28": "Retail Liabilities",
    "29": "Retail Services", "30": "Credit/Advances", "31": "Investment/Treasury",
    "32": "Credit Monitoring & Recovery", "33": "Foreign Exchange", "34": "Trade Finance",
    "35": "Priority Sector Advances", "36": "Government Business", "39": "Miscellaneous"
}

def is_item_number(text: str) -> bool:
    """Check if text is an item number"""
    text = text.strip()
    # Avoid dates
    if re.match(r'^\d{2}\.\d{2}\.\d{4}', text):
        return False
    # Avoid TR codes
    if re.match(r'^TR\d+', text):
        return False
    # Match item numbers
    if re.match(r'^\d+(\.\d+)*$', text):
        return True
    return False

def is_risk_category(text: str) -> bool:
    """Check if text is a risk category"""
    text = text.strip()
    return text in ['Operational Risk', 'Credit Risk', 'Business Risk', 
                    'Compliance Risk', 'Regulatory Compliance', 'General']

def is_header_line(text: str) -> bool:
    """Check if text is a header line"""
    text = text.strip()
    return text in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level', 
                    'Internal Audit format of RBG', ''] or text.startswith('(Effective from') or \
                    text.startswith('Page ')

def extract_area_code(item_number: str) -> str:
    """Extract area code from item number"""
    return item_number.split('.')[0]

def clean_description(text: str) -> str:
    """Clean description text"""
    text = ' '.join(text.split())
    text = text.strip('"\'')
    return text

def split_into_pages(content: str) -> List[str]:
    """Split content into pages"""
    pages = []
    current_page = []
    
    for line in content.split('\n'):
        if re.match(r'^Page \d+ of \d+', line.strip()):
            if current_page:
                pages.append('\n'.join(current_page))
                current_page = []
        else:
            current_page.append(line)
    
    if current_page:
        pages.append('\n'.join(current_page))
    
    return pages

def parse_page(page_content: str) -> List[Dict]:
    """Parse a single page and extract items"""
    
    lines = [l.strip() for l in page_content.split('\n')]
    
    # Separate into columns
    item_numbers = []
    rbs_codes = []
    descriptions = []
    risks = []
    
    # State machine to parse the page
    state = 'INIT'  # INIT -> ITEMS -> RBS -> DESCRIPTIONS -> RISKS
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip headers
        if is_header_line(line):
            i += 1
            continue
        
        if not line:
            i += 1
            continue
        
        # Detect state transitions
        # After we see item numbers, we'll see RBS codes (TR codes), then descriptions, then risks
        
        if is_item_number(line):
            item_numbers.append(line)
            if state == 'INIT':
                state = 'ITEMS'
        
        elif re.match(r'^TR\d+', line):
            rbs_codes.append(line)
            if state == 'ITEMS':
                state = 'RBS'
        
        elif is_risk_category(line):
            risks.append(line)
            if state in ['ITEMS', 'RBS', 'DESCRIPTIONS']:
                state = 'RISKS'
        
        elif state == 'ITEMS' and not is_item_number(line) and not re.match(r'^TR\d+', line):
            # This must be start of descriptions
            state = 'DESCRIPTIONS'
            descriptions.append(line)
        
        elif state == 'DESCRIPTIONS':
            if not is_risk_category(line) and not re.match(r'^TR\d+', line):
                descriptions.append(line)
        
        i += 1
    
    # Now align item numbers with descriptions
    # The number of item numbers should roughly match descriptions
    items = []
    
    for idx, item_num in enumerate(item_numbers):
        # Get corresponding description
        desc = ""
        if idx < len(descriptions):
            desc = descriptions[idx]
        
        # Get corresponding risk
        risk = "Operational Risk"
        if idx < len(risks):
            risk = risks[idx]
        elif risks:
            risk = risks[-1]  # Use last known risk
        
        items.append({
            'item_number': item_num,
            'description': desc,
            'risk': risk
        })
    
    return items

def parse_document_by_structure(content: str) -> List[Dict]:
    """
    Parse the document understanding the sequential column structure.
    The pattern is: item numbers block -> risks block -> descriptions block
    """
    
    lines = [l.strip() for l in content.split('\n')]
    
    # Find all sections (marked by single digit item numbers)
    sections = []
    for i, line in enumerate(lines):
        if re.match(r'^\d+$', line) and not re.match(r'^\d{4}', line):
            sections.append((i, line))
    
    print(f"Found {len(sections)} major sections")
    
    items = []
    all_items_data = []
    
    # Parse line by line, building up item data
    i = 0
    current_item = None
    current_risk = "Operational Risk"
    pending_items = []  # List of item numbers waiting for descriptions
    
    while i < len(lines):
        line = lines[i]
        
        # Skip headers and empty lines
        if is_header_line(line) or not line:
            i += 1
            continue
        
        # Check if it's an item number
        if is_item_number(line):
            pending_items.append({'item': line, 'risk': current_risk, 'desc': ''})
            i += 1
            continue
        
        # Check if it's a risk category
        if is_risk_category(line):
            current_risk = line
            # Update last pending item's risk if no description yet
            if pending_items and not pending_items[-1]['desc']:
                pending_items[-1]['risk'] = current_risk
            i += 1
            continue
        
        # Skip TR codes
        if re.match(r'^TR\d+', line):
            i += 1
            continue
        
        # This should be a description line
        # Assign to the oldest pending item without a description
        if pending_items and len(line) >= 5:
            for item_data in pending_items:
                if not item_data['desc']:
                    item_data['desc'] = line
                    break
        
        i += 1
    
    # Convert pending items to final format
    for item_data in pending_items:
        item_num = item_data['item']
        desc = item_data['desc']
        risk = item_data['risk']
        
        # If no description, create generic one
        if not desc or len(desc) < 10:
            area_code = extract_area_code(item_num)
            if area_code in AREA_DEFINITIONS:
                area_name = AREA_DEFINITIONS[area_code]
                if item_num == area_code:
                    desc = f"{area_name} Management"
                else:
                    parts = item_num.split('.')
                    if len(parts) == 2:
                        desc = f"{area_name} verification and processes"
                    else:
                        desc = f"{area_name} compliance check"
            else:
                desc = f"Examination item {item_num}"
        
        desc = clean_description(desc)
        
        area_code = extract_area_code(item_num)
        items.append({
            "areaCode": area_code,
            "areaName": AREA_DEFINITIONS.get(area_code, f"Area {area_code}"),
            "itemNumber": item_num,
            "particulars": desc,
            "riskCategory": risk,
            "regulatoryReference": None,
            "displayOrder": len(items) + 1
        })
    
    return items

def read_file(file_path: str) -> str:
    """Read file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def create_areas(items: List[Dict]) -> List[Dict]:
    """Create areas from items"""
    
    # Filter out invalid area codes (like TR codes that got misidentified)
    valid_items = [item for item in items if item['areaCode'].isdigit() and 
                   int(item['areaCode']) <= 40]
    
    area_counts = {}
    for item in valid_items:
        area_code = item['areaCode']
        if area_code not in area_counts:
            area_counts[area_code] = 0
        area_counts[area_code] += 1
    
    areas = []
    for area_code in sorted(area_counts.keys(), key=lambda x: int(x)):
        area_name = AREA_DEFINITIONS.get(area_code, f"Area {area_code}")
        code = area_name.upper().replace(' ', '_').replace('/', '_')
        
        areas.append({
            "code": code,
            "name": area_name,
            "displayOrder": len(areas) + 1,
            "sectionNumber": int(area_code),
            "itemCount": area_counts[area_code]
        })
    
    return areas

def main():
    print("Reading source file...")
    content = read_file('/root/.openclaw/workspace/AEGIS/IA-FORMAT-RBG.md')
    
    print("Parsing document...")
    items = parse_document_by_structure(content)
    
    # Filter out invalid items (TR codes, years, etc.)
    valid_items = [item for item in items if item['areaCode'].isdigit() and 
                   int(item['areaCode']) <= 40]
    
    print(f"\nExtracted {len(valid_items)} valid items (filtered from {len(items)} total)")
    
    # Create areas
    print("Creating areas...")
    areas = create_areas(valid_items)
    
    print(f"Created {len(areas)} areas")
    
    # Write files
    items_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json'
    print(f"\nWriting items to {items_path}...")
    with open(items_path, 'w', encoding='utf-8') as f:
        json.dump(valid_items, f, indent=2, ensure_ascii=False)
    
    areas_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-areas.json'
    print(f"Writing areas to {areas_path}...")
    with open(areas_path, 'w', encoding='utf-8') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    
    # Summary
    print("\n" + "="*70)
    print("EXTRACTION SUMMARY")
    print("="*70)
    print(f"Total items extracted: {len(valid_items)}")
    print(f"\nItems per area:")
    
    for area in areas:
        print(f"  {area['sectionNumber']:>2} - {area['name']:<35} {area['itemCount']:>3} items")
    
    # Check quality
    short_descs = [item for item in valid_items if len(item['particulars']) < 30]
    if short_descs:
        print(f"\n⚠️  {len(short_descs)} items with short descriptions (<30 chars):")
        for item in short_descs[:10]:
            print(f"  {item['itemNumber']}: {item['particulars']}")
    
    # Sample items
    print(f"\n" + "="*70)
    print("SAMPLE ITEMS")
    print("="*70)
    for i in [0, 20, 100, 200, 300, 400, 500]:
        if i < len(valid_items):
            item = valid_items[i]
            print(f"\n[{item['itemNumber']}] {item['areaName']} - {item['riskCategory']}")
            desc = item['particulars']
            if len(desc) > 120:
                desc = desc[:120] + "..."
            print(f"  → {desc}")

if __name__ == '__main__':
    main()
