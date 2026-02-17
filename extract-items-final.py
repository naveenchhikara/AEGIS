#!/usr/bin/env python3
"""
Final extraction: The document has sequential blocks:
1. Block of item numbers
2. Block of risk categories (one per item)
3. Block of descriptions (one per item, may be multi-line)

Key insight: The ORDER is preserved! nth item number maps to nth risk and nth description.
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

def is_header(text: str) -> bool:
    """Check if text is a header"""
    text = text.strip()
    return text in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level'] or \
           text.startswith('Page ') or text.startswith('Internal Audit') or \
           text.startswith('(Effective from')

def extract_area_code(item_number: str) -> str:
    """Extract area code from item number"""
    return item_number.split('.')[0]

def clean_text(text: str) -> str:
    """Clean text"""
    text = ' '.join(text.split())
    return text.strip()

def parse_document(content: str) -> List[Dict]:
    """Parse document extracting items, risks, and descriptions in order"""
    
    lines = [l.strip() for l in content.split('\n')]
    
    # Phase 1: Extract all item numbers
    item_numbers = []
    for line in lines:
        if is_item_number(line):
            item_numbers.append(line)
    
    print(f"Phase 1: Found {len(item_numbers)} item numbers")
    
    # Phase 2: Extract all risk categories (same count as items)
    risks = []
    for line in lines:
        if is_risk_category(line):
            risks.append(line)
    
    print(f"Phase 2: Found {len(risks)} risk categories")
    
    # Phase 3: Extract descriptions
    # Everything that's not an item number, risk, header, or TR code is a description
    descriptions = []
    for line in lines:
        if not line:
            continue
        if is_header(line):
            continue
        if is_item_number(line):
            continue
        if is_risk_category(line):
            continue
        if re.match(r'^TR\d+', line):
            continue
        # This is description text
        descriptions.append(line)
    
    print(f"Phase 3: Found {len(descriptions)} description lines")
    
    # Phase 4: Group descriptions (there should be one per item)
    # Simple approach: assign description lines sequentially to items
    # More sophisticated: group multi-line descriptions
    
    # Calculate descriptions per item
    if len(item_numbers) > 0:
        lines_per_item = len(descriptions) / len(item_numbers)
        print(f"Average lines per item: {lines_per_item:.2f}")
    
    # Group descriptions by looking for natural breaks
    grouped_descriptions = []
    current_desc = []
    
    for i, desc_line in enumerate(descriptions):
        # Add to current description
        current_desc.append(desc_line)
        
        # Decide when to close this description
        # Heuristic: A description is complete when we have a meaningful sentence
        # or when the next line starts with a capital letter and current is complete
        combined = ' '.join(current_desc)
        
        # If we have enough lines and this looks complete (ends with period, paren, or question mark)
        if len(current_desc) >= 1 and (
            desc_line.endswith(('.', ')', '?', '"')) or
            len(combined) > 50 or
            (i + 1 < len(descriptions) and len(combined) > 20 and 
             descriptions[i+1][0].isupper())
        ):
            grouped_descriptions.append(clean_text(' '.join(current_desc)))
            current_desc = []
    
    # Don't forget the last one
    if current_desc:
        grouped_descriptions.append(clean_text(' '.join(current_desc)))
    
    print(f"Phase 4: Grouped into {len(grouped_descriptions)} descriptions")
    
    # Phase 5: Align items, risks, and descriptions
    items = []
    
    for idx, item_num in enumerate(item_numbers):
        # Get risk (one per item)
        risk = risks[idx] if idx < len(risks) else "Operational Risk"
        
        # Get description (one per item)
        desc = ""
        if idx < len(grouped_descriptions):
            desc = grouped_descriptions[idx]
        
        # Validate and clean
        if not desc or len(desc) < 10:
            area_code = extract_area_code(item_num)
            if area_code in AREA_DEFINITIONS:
                area_name = AREA_DEFINITIONS[area_code]
                if item_num == area_code:
                    desc = f"{area_name} Management"
                elif item_num.count('.') == 1:
                    desc = f"{area_name} verification and compliance"
                else:
                    desc = f"{area_name} examination"
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
    print("EXAMINATION ITEMS EXTRACTOR")
    print("="*70)
    
    print("\nReading source file...")
    with open('/root/.openclaw/workspace/AEGIS/IA-FORMAT-RBG.md', 'r') as f:
        content = f.read()
    
    print("Parsing document...\n")
    items = parse_document(content)
    
    print(f"\nExtracted {len(items)} items")
    
    print("Creating areas...")
    areas = create_areas(items)
    
    print(f"Created {len(areas)} areas")
    
    # Write files
    items_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json'
    print(f"\nWriting items to {items_path}...")
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
    
    # Quality check
    short = [item for item in items if len(item['particulars']) < 30]
    long = [item for item in items if len(item['particulars']) > 200]
    
    print(f"\nQuality metrics:")
    print(f"  Short descriptions (<30 chars): {len(short)}")
    print(f"  Long descriptions (>200 chars): {len(long)}")
    print(f"  Average description length: {sum(len(i['particulars']) for i in items) / len(items):.1f} chars")
    
    # Sample items
    print(f"\n" + "="*70)
    print("SAMPLE ITEMS (every 50th)")
    print("="*70)
    
    for i in range(0, len(items), 50):
        item = items[i]
        desc = item['particulars']
        if len(desc) > 100:
            desc = desc[:100] + "..."
        print(f"\n[{item['itemNumber']}] {item['areaName']}")
        print(f"  Risk: {item['riskCategory']}")
        print(f"  Check: {desc}")
    
    print(f"\n✓ Extraction complete!")

if __name__ == '__main__':
    main()
