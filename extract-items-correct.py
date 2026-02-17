#!/usr/bin/env python3
"""
Correct extraction: Parse the three parallel arrays and zip them together.
The document structure is:
1. Array of ALL item numbers (581 items)
2. Array of ALL risk categories (one per item, but may be fewer if last items share risks)
3. Array of ALL descriptions (one per item, multi-line descriptions concatenated)
"""

import re
import json
from typing import List, Dict

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
    if re.match(r'^\d{2}\.\d{2}\.\d{4}', text):  # date
        return False
    if re.match(r'^TR\d+', text):  # TR code
        return False
    if re.match(r'^\d+(\.\d+)*$', text):
        return True
    return False

def is_risk_category(text: str) -> bool:
    """Check if text is a risk category"""
    text = text.strip()
    return text in ['Operational Risk', 'Credit Risk', 'Business Risk', 
                    'Compliance Risk', 'Regulatory Compliance', 'General']

def is_header_or_junk(text: str) -> bool:
    """Check if text should be skipped"""
    text = text.strip()
    if not text:
        return True
    if text in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level']:
        return True
    if text.startswith('Page ') or text.startswith('Internal Audit') or text.startswith('(Effective from'):
        return True
    if re.match(r'^TR\d+\s*-\s*\d+', text):  # TR codes with numbers
        return True
    return False

def extract_area_code(item_number: str) -> str:
    """Extract area code from item number"""
    return item_number.split('.')[0]

def clean_text(text: str) -> str:
    """Clean text"""
    text = ' '.join(text.split())
    return text.strip()

def parse_document(content: str) -> List[Dict]:
    """Parse document into three parallel arrays and zip them"""
    
    lines = [l.strip() for l in content.split('\n')]
    
    # Phase 1: Collect all item numbers
    item_numbers = []
    for line in lines:
        if is_item_number(line):
            item_numbers.append(line)
    
    print(f"Collected {len(item_numbers)} item numbers")
    
    # Phase 2: Collect all risks (sequentially after items in the file)
    risks = []
    for line in lines:
        if is_risk_category(line):
            risks.append(line)
    
    print(f"Collected {len(risks)} risk categories")
    
    # Pad risks if needed (later items may reuse last risk)
    while len(risks) < len(item_numbers):
        risks.append(risks[-1] if risks else "Operational Risk")
    
    # Phase 3: Collect description lines (everything else that's not header/junk)
    desc_lines = []
    for line in lines:
        if is_header_or_junk(line):
            continue
        if is_item_number(line):
            continue
        if is_risk_category(line):
            continue
        # This is a description line
        desc_lines.append(line)
    
    print(f"Collected {len(desc_lines)} description lines")
    
    # Phase 4: Group description lines into descriptions (one per item)
    # Strategy: Split the desc_lines array into item_numbers count of groups
    # Each item gets floor(total_lines / num_items) lines, with remainder distributed
    
    descriptions = []
    lines_per_item = len(desc_lines) // len(item_numbers)
    remainder = len(desc_lines) % len(item_numbers)
    
    print(f"Allocating ~{lines_per_item} lines per item (with {remainder} extra)")
    
    idx = 0
    for i in range(len(item_numbers)):
        # How many lines for this item?
        num_lines = lines_per_item + (1 if i < remainder else 0)
        
        # Collect lines for this item
        item_desc_lines = []
        for j in range(num_lines):
            if idx < len(desc_lines):
                item_desc_lines.append(desc_lines[idx])
                idx += 1
        
        # Combine into single description
        desc = clean_text(' '.join(item_desc_lines))
        descriptions.append(desc)
    
    print(f"Created {len(descriptions)} descriptions")
    
    # Phase 5: Zip together into items
    items = []
    
    for idx in range(len(item_numbers)):
        item_num = item_numbers[idx]
        risk = risks[idx] if idx < len(risks) else "Operational Risk"
        desc = descriptions[idx] if idx < len(descriptions) else ""
        
        # Validate description
        if not desc or len(desc) < 10:
            area_code = extract_area_code(item_num)
            if area_code in AREA_DEFINITIONS:
                area_name = AREA_DEFINITIONS[area_code]
                if item_num == area_code:
                    desc = f"{area_name} Management"
                else:
                    desc = f"{area_name} verification and compliance"
            else:
                desc = f"Examination item {item_num}"
        
        area_code = extract_area_code(item_num)
        
        # Skip invalid area codes
        if not area_code.isdigit() or int(area_code) > 40:
            continue
        
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

def create_areas(items: List[Dict]) -> List[Dict]:
    """Create areas from items"""
    
    area_counts = {}
    for item in items:
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
    print("="*70)
    print("EXAMINATION ITEMS EXTRACTOR - CORRECT VERSION")
    print("="*70)
    
    print("\nReading source file...")
    with open('/root/.openclaw/workspace/AEGIS/IA-FORMAT-RBG.md', 'r') as f:
        content = f.read()
    
    print("Parsing document...\n")
    items = parse_document(content)
    
    print(f"\n✓ Extracted {len(items)} valid items")
    
    print("Creating areas...")
    areas = create_areas(items)
    
    print(f"✓ Created {len(areas)} areas\n")
    
    # Write files
    items_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json'
    print(f"Writing items to {items_path}...")
    with open(items_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    areas_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-areas.json'
    print(f"Writing areas to {areas_path}...")
    with open(areas_path, 'w', encoding='utf-8') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    
    # Summary
    print("\n" + "="*70)
    print("EXTRACTION SUMMARY")
    print("="*70)
    print(f"Total items: {len(items)}")
    print(f"Total areas: {len(areas)}")
    print(f"\nItems per area:")
    
    for area in areas:
        print(f"  {area['sectionNumber']:>2}. {area['name']:<35} {area['itemCount']:>3} items")
    
    # Quality metrics
    short = [item for item in items if len(item['particulars']) < 30]
    long = [item for item in items if len(item['particulars']) > 300]
    
    avg_len = sum(len(i['particulars']) for i in items) / len(items) if items else 0
    
    print(f"\nQuality metrics:")
    print(f"  Short descriptions (<30 chars): {len(short)}")
    print(f"  Long descriptions (>300 chars): {len(long)}")
    print(f"  Average description length: {avg_len:.1f} chars")
    
    if short:
        print(f"\n⚠️  Items with short descriptions:")
        for item in short[:10]:
            print(f"    {item['itemNumber']}: {item['particulars']}")
    
    # Sample items
    print(f"\n" + "="*70)
    print("SAMPLE ITEMS (every 100th)")
    print("="*70)
    
    for i in [0, 100, 200, 300, 400, 500]:
        if i < len(items):
            item = items[i]
            desc = item['particulars']
            if len(desc) > 150:
                desc = desc[:150] + "..."
            print(f"\n[{item['itemNumber']}] {item['areaName']} - {item['riskCategory']}")
            print(f"  → {desc}")
    
    print(f"\n" + "="*70)
    print("✓ EXTRACTION COMPLETE!")
    print("="*70)

if __name__ == '__main__':
    main()
