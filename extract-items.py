#!/usr/bin/env python3
"""
Extract examination items from IA-FORMAT-RBG.md
The PDF-to-markdown conversion placed columns sequentially instead of side-by-side.
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
    """Check if a line looks like an item number (e.g., 1.1, 1.1.1, 27.3.15)"""
    text = text.strip()
    # Avoid dates like "21.03.2017"
    if re.match(r'^\d{2}\.\d{2}\.\d{4}', text):
        return False
    # Match patterns like 1, 1.1, 1.1.1, etc.
    if re.match(r'^\d+(\.\d+)*$', text):
        return True
    return False

def is_risk_category(text: str) -> bool:
    """Check if a line is a risk category"""
    text = text.strip()
    return text in ['Operational Risk', 'Credit Risk', 'Business Risk', 'Compliance Risk', 
                    'Regulatory Compliance', 'General']

def clean_description(text: str) -> str:
    """Clean and normalize description text"""
    # Remove extra whitespace
    text = ' '.join(text.split())
    # Remove leading/trailing quotes
    text = text.strip('"\'')
    return text

def extract_area_code(item_number: str) -> str:
    """Extract area code from item number (e.g., '1.1.1' -> '1')"""
    return item_number.split('.')[0]

def read_file(file_path: str) -> str:
    """Read the markdown file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def parse_document(content: str) -> List[Dict]:
    """Parse the document and extract examination items"""
    
    lines = content.split('\n')
    items = []
    current_section = None
    current_item_numbers = []
    current_risks = []
    current_descriptions = []
    in_item_block = False
    in_risk_block = False
    in_desc_block = False
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip header lines
        if line.startswith('Internal Audit format') or line.startswith('Index') or \
           line.startswith('RBS') or line.startswith('Functional Area') or \
           line.startswith('Business Risk') or line == 'Level' or line.startswith('Page '):
            i += 1
            continue
        
        # Detect item number
        if is_item_number(line):
            # Check if this is a new section (single digit)
            if re.match(r'^\d+$', line):
                current_section = line
            current_item_numbers.append(line)
            i += 1
            continue
        
        # Detect risk category
        if is_risk_category(line):
            current_risks.append(line)
            i += 1
            continue
        
        # Everything else is description
        if line and not line.startswith('---') and len(line) > 2:
            current_descriptions.append(line)
        
        i += 1
    
    # Now we need to intelligently pair item numbers with descriptions
    # The file structure has item numbers first, then risks, then descriptions
    # We need to read it section by section
    
    # Let's re-parse more carefully
    return parse_by_sections(content)

def parse_by_sections(content: str) -> List[Dict]:
    """Parse document section by section"""
    
    items = []
    lines = content.split('\n')
    
    # Find all item numbers and their positions
    item_positions = []
    for i, line in enumerate(lines):
        line = line.strip()
        if is_item_number(line) and not re.match(r'^\d{2}\.\d{2}\.\d{4}', line):
            item_positions.append((i, line))
    
    print(f"Found {len(item_positions)} item numbers")
    
    # Process each item
    current_area = "1"
    for idx, (pos, item_num) in enumerate(item_positions):
        area_code = extract_area_code(item_num)
        
        # Get description from nearby lines
        # Look ahead for description (skip risk categories)
        description = ""
        risk_category = "Operational Risk"  # default
        
        # Look at next few lines
        for j in range(pos + 1, min(pos + 10, len(lines))):
            line = lines[j].strip()
            
            # Skip empty lines and headers
            if not line or line.startswith('Page ') or line in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level']:
                continue
            
            # Capture risk category if found
            if is_risk_category(line):
                risk_category = line
                continue
            
            # Skip TR codes
            if re.match(r'^TR\d+\s*-\s*\d+', line):
                continue
            
            # This should be description
            if len(line) >= 10 and not is_item_number(line):
                description = clean_description(line)
                break
        
        # If no description found, derive from section
        if not description or len(description) < 10:
            if area_code in AREA_DEFINITIONS:
                if item_num == area_code:
                    description = f"{AREA_DEFINITIONS[area_code]} Management"
                else:
                    description = f"{AREA_DEFINITIONS[area_code]} - Item {item_num}"
            else:
                description = f"Examination item {item_num}"
        
        # Create item
        item = {
            "areaCode": area_code,
            "areaName": AREA_DEFINITIONS.get(area_code, f"Area {area_code}"),
            "itemNumber": item_num,
            "particulars": description,
            "riskCategory": risk_category,
            "regulatoryReference": None,
            "displayOrder": len(items) + 1
        }
        
        items.append(item)
    
    return items

def manual_extraction(content: str) -> List[Dict]:
    """Manual extraction by reading the structure more carefully"""
    
    items = []
    lines = [l.strip() for l in content.split('\n')]
    
    # State machine approach
    i = 0
    item_buffer = []
    risk_buffer = []
    desc_buffer = []
    
    # Skip to first section
    while i < len(lines) and lines[i] != '1':
        i += 1
    
    current_item = None
    current_risk = "Operational Risk"
    current_desc_lines = []
    
    while i < len(lines):
        line = lines[i]
        
        # Check if it's an item number
        if is_item_number(line) and not re.match(r'^\d{2}\.\d{2}\.\d{4}', line):
            # Save previous item if exists
            if current_item and current_desc_lines:
                desc = clean_description(' '.join(current_desc_lines))
                if len(desc) >= 10:
                    area_code = extract_area_code(current_item)
                    items.append({
                        "areaCode": area_code,
                        "areaName": AREA_DEFINITIONS.get(area_code, f"Area {area_code}"),
                        "itemNumber": current_item,
                        "particulars": desc,
                        "riskCategory": current_risk,
                        "regulatoryReference": None,
                        "displayOrder": len(items) + 1
                    })
            
            # Start new item
            current_item = line
            current_desc_lines = []
            
        elif is_risk_category(line):
            current_risk = line
            
        elif line and len(line) > 5 and not line.startswith('Page ') and \
             not line in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level'] and \
             not re.match(r'^TR\d+', line):
            # This is description
            current_desc_lines.append(line)
        
        i += 1
    
    # Save last item
    if current_item and current_desc_lines:
        desc = clean_description(' '.join(current_desc_lines))
        if len(desc) >= 10:
            area_code = extract_area_code(current_item)
            items.append({
                "areaCode": area_code,
                "areaName": AREA_DEFINITIONS.get(area_code, f"Area {area_code}"),
                "itemNumber": current_item,
                "particulars": desc,
                "riskCategory": current_risk,
                "regulatoryReference": None,
                "displayOrder": len(items) + 1
            })
    
    return items

def create_areas(items: List[Dict]) -> List[Dict]:
    """Create examination areas from items"""
    
    area_counts = {}
    for item in items:
        area_code = item['areaCode']
        if area_code not in area_counts:
            area_counts[area_code] = 0
        area_counts[area_code] += 1
    
    areas = []
    for area_code in sorted(area_counts.keys(), key=lambda x: int(x) if x.isdigit() else 999):
        area_name = AREA_DEFINITIONS.get(area_code, f"Area {area_code}")
        # Generate code from name
        code = area_name.upper().replace(' ', '_').replace('/', '_')
        
        areas.append({
            "code": code,
            "name": area_name,
            "displayOrder": len(areas) + 1,
            "sectionNumber": int(area_code) if area_code.isdigit() else 999,
            "itemCount": area_counts[area_code]
        })
    
    return areas

def main():
    print("Reading source file...")
    content = read_file('/root/.openclaw/workspace/AEGIS/IA-FORMAT-RBG.md')
    
    print("Parsing document...")
    # Try the simpler manual extraction first
    items = manual_extraction(content)
    
    print(f"Extracted {len(items)} items")
    
    # Create areas
    print("Creating areas...")
    areas = create_areas(items)
    
    print(f"Created {len(areas)} areas")
    
    # Write examination items
    items_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json'
    print(f"Writing items to {items_path}...")
    with open(items_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    # Write areas
    areas_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-areas.json'
    print(f"Writing areas to {areas_path}...")
    with open(areas_path, 'w', encoding='utf-8') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n=== EXTRACTION SUMMARY ===")
    print(f"Total items extracted: {len(items)}")
    print(f"\nItems per area:")
    area_counts = {}
    for item in items:
        area = f"{item['areaCode']} - {item['areaName']}"
        area_counts[area] = area_counts.get(area, 0) + 1
    
    for area in sorted(area_counts.keys()):
        print(f"  {area}: {area_counts[area]} items")
    
    # Print some sample items
    print(f"\n=== SAMPLE ITEMS ===")
    for i in [0, 10, 50, 100, 200]:
        if i < len(items):
            item = items[i]
            print(f"\n{item['itemNumber']} ({item['areaName']})")
            print(f"  {item['particulars'][:100]}...")

if __name__ == '__main__':
    main()
