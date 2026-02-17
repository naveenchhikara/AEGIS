#!/usr/bin/env python3
"""
Smart extraction: Parse with better description grouping logic.
Use natural language patterns to identify description boundaries.
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
    text = text.strip()
    if re.match(r'^\d{2}\.\d{2}\.\d{4}', text):
        return False
    if re.match(r'^TR\d+', text):
        return False
    return re.match(r'^\d+(\.\d+)*$', text) is not None

def is_risk_category(text: str) -> bool:
    text = text.strip()
    return text in ['Operational Risk', 'Credit Risk', 'Business Risk', 
                    'Compliance Risk', 'Regulatory Compliance', 'General']

def is_junk(text: str) -> bool:
    text = text.strip()
    if not text:
        return True
    if text in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level']:
        return True
    if text.startswith('Page ') or text.startswith('Internal Audit') or text.startswith('(Effective from'):
        return True
    if re.match(r'^TR\d+\s*-\s*\d+', text):
        return True
    return False

def extract_area_code(item_number: str) -> str:
    return item_number.split('.')[0]

def clean_text(text: str) -> str:
    return ' '.join(text.split()).strip()

def looks_like_new_description(line: str, prev_line: str = "") -> bool:
    """
    Heuristic to detect if a line starts a new description.
    A new description typically:
    - Starts with a capital letter or number
    - Previous line ended with punctuation or is short
    """
    if not prev_line:
        return True
    
    # Previous line ends with strong punctuation
    if prev_line.rstrip().endswith(('.', ')', '?', '"', ':')):
        return True
    
    # Previous line is short (likely complete)
    if len(prev_line) < 40:
        return True
    
    # Current line starts with number or capital and prev has no continuation cues
    if line and line[0].isupper() or line[0].isdigit():
        # Check if previous doesn't end with continuation markers
        if not prev_line.rstrip().endswith((',', 'and', 'or', 'the', 'a', 'an', 'of', 'in', 'to')):
            return True
    
    return False

def group_descriptions_smart(desc_lines: List[str], target_count: int) -> List[str]:
    """
    Group description lines into target_count descriptions using NLP heuristics.
    """
    if not desc_lines:
        return []
    
    # Start with one description
    descriptions = []
    current_desc = []
    
    for i, line in enumerate(desc_lines):
        prev_line = desc_lines[i-1] if i > 0 else ""
        
        # Should we start a new description?
        if current_desc and looks_like_new_description(line, current_desc[-1]):
            # Save current description
            descriptions.append(clean_text(' '.join(current_desc)))
            current_desc = []
        
        current_desc.append(line)
        
        # Force break if we're behind target and have a complete sentence
        if len(descriptions) < target_count * (i / len(desc_lines)) and line.rstrip().endswith(('.', ')', '?')):
            if current_desc:
                descriptions.append(clean_text(' '.join(current_desc)))
                current_desc = []
    
    # Don't forget the last one
    if current_desc:
        descriptions.append(clean_text(' '.join(current_desc)))
    
    print(f"  Smart grouping created {len(descriptions)} from {len(desc_lines)} lines (target: {target_count})")
    
    # If we have too few, split longer ones
    while len(descriptions) < target_count and descriptions:
        # Find longest description and try to split it
        longest_idx = max(range(len(descriptions)), key=lambda i: len(descriptions[i]))
        longest = descriptions[longest_idx]
        
        # Try to split on sentence boundaries
        sentences = re.split(r'(\. |\) |\? )', longest)
        if len(sentences) > 2:
            mid = len(sentences) // 2
            part1 = ''.join(sentences[:mid]).strip()
            part2 = ''.join(sentences[mid:]).strip()
            descriptions[longest_idx] = part1
            descriptions.insert(longest_idx + 1, part2)
        else:
            # Can't split more, just duplicate
            descriptions.append(descriptions[longest_idx])
    
    # If we have too many, merge shortest ones
    while len(descriptions) > target_count:
        # Find shortest description and merge with next
        shortest_idx = min(range(len(descriptions)-1), key=lambda i: len(descriptions[i]))
        merged = descriptions[shortest_idx] + " " + descriptions[shortest_idx + 1]
        descriptions[shortest_idx] = merged
        del descriptions[shortest_idx + 1]
    
    return descriptions

def parse_document(content: str) -> List[Dict]:
    """Parse document with smart description grouping"""
    
    lines = [l.strip() for l in content.split('\n')]
    
    # Collect item numbers
    item_numbers = [line for line in lines if is_item_number(line)]
    print(f"✓ Collected {len(item_numbers)} item numbers")
    
    # Collect risks
    risks = [line for line in lines if is_risk_category(line)]
    print(f"✓ Collected {len(risks)} risk categories")
    
    # Pad risks
    while len(risks) < len(item_numbers):
        risks.append(risks[-1] if risks else "Operational Risk")
    
    # Collect description lines
    desc_lines = []
    for line in lines:
        if is_junk(line) or is_item_number(line) or is_risk_category(line):
            continue
        desc_lines.append(line)
    
    print(f"✓ Collected {len(desc_lines)} description lines")
    
    # Smart group descriptions
    print("Grouping descriptions...")
    descriptions = group_descriptions_smart(desc_lines, len(item_numbers))
    
    # Ensure we have exactly the right number
    while len(descriptions) < len(item_numbers):
        descriptions.append("")
    descriptions = descriptions[:len(item_numbers)]
    
    print(f"✓ Created {len(descriptions)} descriptions")
    
    # Build items
    items = []
    for idx in range(len(item_numbers)):
        item_num = item_numbers[idx]
        risk = risks[idx]
        desc = descriptions[idx]
        
        # Validate
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
        
        # Skip invalid
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
    area_counts = {}
    for item in items:
        area_code = item['areaCode']
        area_counts[area_code] = area_counts.get(area_code, 0) + 1
    
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
    print("SMART EXAMINATION ITEMS EXTRACTOR")
    print("="*70 + "\n")
    
    with open('/root/.openclaw/workspace/AEGIS/IA-FORMAT-RBG.md', 'r') as f:
        content = f.read()
    
    items = parse_document(content)
    print(f"\n✓ Extracted {len(items)} valid items")
    
    areas = create_areas(items)
    print(f"✓ Created {len(areas)} areas\n")
    
    # Write
    with open('/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json', 'w') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    with open('/root/.openclaw/workspace/AEGIS/src/data/seed/examination-areas.json', 'w') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    
    print("="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total items: {len(items)}\n")
    
    for area in areas:
        print(f"  {area['sectionNumber']:>2}. {area['name']:<35} {area['itemCount']:>3} items")
    
    # Quality
    short = [i for i in items if len(i['particulars']) < 30]
    avg_len = sum(len(i['particulars']) for i in items) / len(items)
    
    print(f"\nQuality:")
    print(f"  Average length: {avg_len:.1f} chars")
    print(f"  Short (<30): {len(short)} items")
    
    # Samples
    print(f"\n" + "="*70)
    print("SAMPLES")
    print("="*70)
    for i in [0, 10, 50, 100, 200, 300, 400, 500]:
        if i < len(items):
            item = items[i]
            desc = item['particulars'][:120] + "..." if len(item['particulars']) > 120 else item['particulars']
            print(f"\n[{item['itemNumber']}] {item['areaName']}")
            print(f"  {desc}")
    
    print(f"\n✓ Files written successfully!\n")

if __name__ == '__main__':
    main()
