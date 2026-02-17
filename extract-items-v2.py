#!/usr/bin/env python3
"""
Extract examination items from IA-FORMAT-RBG.md
Parse the document understanding that it has sequential blocks:
1. Item numbers block
2. Risk categories block  
3. Descriptions block (with item numbers inline)
"""

import re
import json
from typing import List, Dict, Tuple, Optional

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
    """Check if a line looks like an item number"""
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

def extract_area_code(item_number: str) -> str:
    """Extract area code from item number"""
    return item_number.split('.')[0]

def clean_description(text: str) -> str:
    """Clean description text"""
    # Join multiple lines
    text = ' '.join(text.split())
    # Remove quotes
    text = text.strip('"\'')
    return text

def extract_from_mixed_content(content: str) -> List[Dict]:
    """
    Extract items from the document which has a mixed structure.
    The pattern is:
    - Item number appears as standalone line
    - Then later, the description appears with the item number inline
    """
    
    lines = content.split('\n')
    items = []
    
    # Build a mapping of item_number -> description
    item_desc_map = {}
    item_risk_map = {}
    
    all_item_numbers = []
    
    # First pass: collect all item numbers
    for line in lines:
        line = line.strip()
        if is_item_number(line):
            all_item_numbers.append(line)
    
    print(f"Found {len(all_item_numbers)} item numbers")
    
    # Second pass: extract descriptions
    # Look for lines that have actual audit check descriptions
    current_risk = "Operational Risk"
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Track risk categories
        if is_risk_category(line):
            current_risk = line
            i += 1
            continue
        
        # Skip headers and page markers
        if not line or line.startswith('Page ') or line in ['Index', 'Id', 'RBS', 
            'Functional Area', 'Business Risk', 'Level'] or line.startswith('Internal Audit'):
            i += 1
            continue
        
        # Skip TR codes and dates
        if re.match(r'^TR\d+', line) or re.match(r'^\d{2}\.\d{2}\.\d{4}', line):
            i += 1
            continue
        
        # If it's an item number, try to find its description in subsequent lines
        if is_item_number(line):
            item_num = line
            # Look ahead for description
            desc_lines = []
            j = i + 1
            
            while j < len(lines) and len(desc_lines) < 5:
                next_line = lines[j].strip()
                
                # Stop if we hit another item number
                if is_item_number(next_line):
                    break
                
                # Stop at page markers
                if next_line.startswith('Page '):
                    break
                
                # Capture risk
                if is_risk_category(next_line):
                    current_risk = next_line
                    j += 1
                    continue
                
                # Skip headers, TR codes, dates
                if next_line and next_line not in ['Index', 'Id', 'RBS', 'Functional Area', 
                    'Business Risk', 'Level'] and not re.match(r'^TR\d+', next_line) and \
                    not re.match(r'^\d{2}\.\d{2}\.\d{4}', next_line):
                    desc_lines.append(next_line)
                
                j += 1
            
            if desc_lines:
                description = clean_description(' '.join(desc_lines))
                if len(description) >= 10:
                    item_desc_map[item_num] = description
                    item_risk_map[item_num] = current_risk
        
        i += 1
    
    # Build items from collected data
    for item_num in all_item_numbers:
        area_code = extract_area_code(item_num)
        
        # Get description
        description = item_desc_map.get(item_num, "")
        
        # If no description, create a generic one
        if not description or len(description) < 10:
            if area_code in AREA_DEFINITIONS:
                area_name = AREA_DEFINITIONS[area_code]
                if item_num == area_code:
                    description = f"{area_name} Management"
                elif '.' not in item_num:
                    description = f"{area_name}"
                else:
                    # Try to infer from section
                    parts = item_num.split('.')
                    if len(parts) == 2:
                        description = f"{area_name} - Section {parts[1]}"
                    else:
                        description = f"{area_name} - Item {item_num}"
            else:
                description = f"Examination item {item_num}"
        
        # Get risk
        risk = item_risk_map.get(item_num, "Operational Risk")
        
        # Create item
        item = {
            "areaCode": area_code,
            "areaName": AREA_DEFINITIONS.get(area_code, f"Area {area_code}"),
            "itemNumber": item_num,
            "particulars": description,
            "riskCategory": risk,
            "regulatoryReference": None,
            "displayOrder": len(items) + 1
        }
        
        items.append(item)
    
    return items

def read_file(file_path: str) -> str:
    """Read the file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

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
    
    print("Extracting items...")
    items = extract_from_mixed_content(content)
    
    print(f"\nExtracted {len(items)} items")
    
    # Create areas
    print("Creating areas...")
    areas = create_areas(items)
    
    print(f"Created {len(areas)} areas")
    
    # Write examination items
    items_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json'
    print(f"\nWriting items to {items_path}...")
    with open(items_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    # Write areas
    areas_path = '/root/.openclaw/workspace/AEGIS/src/data/seed/examination-areas.json'
    print(f"Writing areas to {areas_path}...")
    with open(areas_path, 'w', encoding='utf-8') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n" + "="*60)
    print("EXTRACTION SUMMARY")
    print("="*60)
    print(f"Total items extracted: {len(items)}")
    print(f"\nItems per area:")
    
    area_counts = {}
    for item in items:
        area = f"{item['areaCode']:>2} - {item['areaName']}"
        area_counts[area] = area_counts.get(area, 0) + 1
    
    for area in sorted(area_counts.keys()):
        print(f"  {area}: {area_counts[area]:>3} items")
    
    # Check for missing descriptions
    short_descs = [item for item in items if len(item['particulars']) < 20]
    if short_descs:
        print(f"\n⚠️  Warning: {len(short_descs)} items with short descriptions (<20 chars)")
        print("Sample:")
        for item in short_descs[:5]:
            print(f"  {item['itemNumber']}: {item['particulars']}")
    
    # Print sample items
    print(f"\n" + "="*60)
    print("SAMPLE ITEMS")
    print("="*60)
    for i in [0, 10, 50, 100, 200, 300]:
        if i < len(items):
            item = items[i]
            print(f"\n{item['itemNumber']} - {item['areaName']} ({item['riskCategory']})")
            desc = item['particulars']
            if len(desc) > 100:
                desc = desc[:100] + "..."
            print(f"  {desc}")

if __name__ == '__main__':
    main()
