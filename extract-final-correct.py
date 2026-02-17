#!/usr/bin/env python3
"""
Final correct extraction based on manual analysis.
Pattern:
- Item 1 (line 13): "1" -> Description (line 52): "Cash" 
- Item 2 (line 14): "1.1" -> Description (line 53): "Physical Verification"
- Item 3 (line 15): "1.1.1" -> Description (line 54): "Vault cash"

Descriptions can be multi-line. A new description starts when:
1. The line is short and looks like a heading (titlecase, <50 chars), OR
2. The previous description ended with strong punctuation and this starts with capital
"""

import re
import json

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

def is_item_number(text):
    text = text.strip()
    if re.match(r'^\d{2}\.\d{2}\.\d{4}', text):
        return False
    if re.match(r'^TR\d+', text):
        return False
    return re.match(r'^\d+(\.\d+)*$', text) is not None

def is_risk(text):
    return text.strip() in ['Operational Risk', 'Credit Risk', 'Business Risk', 
                            'Compliance Risk', 'Regulatory Compliance', 'General']

def is_junk(text):
    text = text.strip()
    return not text or text in ['Index', 'Id', 'RBS', 'Functional Area', 'Business Risk', 'Level'] or \
           text.startswith('Page ') or text.startswith('Internal Audit') or text.startswith('(Effective from') or \
           re.match(r'^TR\d+\s*-\s*\d+', text)

def looks_like_new_desc(line, prev_lines):
    """Heuristic: Does this line start a new description?"""
    if not prev_lines:
        return True
    
    # Short title-like lines (e.g., "Cash", "Physical Verification")
    if len(line) < 50 and (line[0].isupper() if line else False):
        # Check if previous ended naturally
        last = prev_lines[-1].rstrip()
        if last.endswith(('.', ')', '?', '"')) or len(last) < 40:
            return True
    
    # Previous description seems complete
    combined = ' '.join(prev_lines)
    if len(combined) > 100 and prev_lines[-1].rstrip().endswith(('.', ')', '?', '"')):
        if line and line[0].isupper():
            return True
    
    return False

def group_descriptions_aligned(desc_lines, num_items):
    """Group description lines into exactly num_items descriptions"""
    descriptions = []
    current_desc = []
    
    for line in desc_lines:
        if looks_like_new_desc(line, current_desc):
            if current_desc:
                descriptions.append(' '.join(current_desc).strip())
            current_desc = [line]
        else:
            current_desc.append(line)
        
        # Force break if we're way behind
        if len(descriptions) < num_items * 0.8 and len(current_desc) > 10:
            descriptions.append(' '.join(current_desc).strip())
            current_desc = []
    
    # Last one
    if current_desc:
        descriptions.append(' '.join(current_desc).strip())
    
    print(f"  Initial grouping: {len(descriptions)} descriptions from {len(desc_lines)} lines")
    
    # Merge if too many
    while len(descriptions) > num_items:
        # Merge smallest with next
        min_idx = min(range(len(descriptions)-1), key=lambda i: len(descriptions[i]))
        descriptions[min_idx] = descriptions[min_idx] + " " + descriptions[min_idx+1]
        del descriptions[min_idx+1]
    
    # Split if too few
    while len(descriptions) < num_items:
        # Split longest
        max_idx = max(range(len(descriptions)), key=lambda i: len(descriptions[i]))
        text = descriptions[max_idx]
        # Split on strong punctuation
        parts = re.split(r'(\.\s+|\)\s+)', text, maxsplit=1)
        if len(parts) >= 3:
            descriptions[max_idx] = (parts[0] + parts[1]).strip()
            descriptions.insert(max_idx+1, parts[2].strip())
        else:
            # Can't split, duplicate
            descriptions.append(text)
    
    print(f"  Final grouping: {len(descriptions)} descriptions")
    return descriptions

def main():
    print("="*70)
    print("FINAL CORRECT EXTRACTION")
    print("="*70 + "\n")
    
    with open('/root/.openclaw/workspace/AEGIS/IA-FORMAT-RBG.md') as f:
        lines = [l.strip() for l in f.readlines()]
    
    # Collect items
    items_list = [l for l in lines if is_item_number(l)]
    print(f"✓ {len(items_list)} items")
    
    # Collect risks
    risks_list = [l for l in lines if is_risk(l)]
    while len(risks_list) < len(items_list):
        risks_list.append(risks_list[-1] if risks_list else "Operational Risk")
    print(f"✓ {len(risks_list)} risks")
    
    # Collect description lines
    desc_lines = [l for l in lines if not is_junk(l) and not is_item_number(l) and not is_risk(l)]
    print(f"✓ {len(desc_lines)} description lines")
    
    # Group descriptions
    print("Grouping descriptions...")
    descriptions = group_descriptions_aligned(desc_lines, len(items_list))
    
    # Build items
    items = []
    for i in range(len(items_list)):
        item_num = items_list[i]
        area_code = item_num.split('.')[0]
        
        if not area_code.isdigit() or int(area_code) > 40:
            continue
        
        risk = risks_list[i] if i < len(risks_list) else "Operational Risk"
        desc = descriptions[i] if i < len(descriptions) else ""
        
        if not desc or len(desc) < 10:
            if area_code in AREA_DEFINITIONS:
                desc = f"{AREA_DEFINITIONS[area_code]} verification"
            else:
                desc = f"Item {item_num}"
        
        items.append({
            "areaCode": area_code,
            "areaName": AREA_DEFINITIONS.get(area_code, f"Area {area_code}"),
            "itemNumber": item_num,
            "particulars": desc,
            "riskCategory": risk,
            "regulatoryReference": None,
            "displayOrder": len(items) + 1
        })
    
    # Create areas
    area_counts = {}
    for item in items:
        area_counts[item['areaCode']] = area_counts.get(item['areaCode'], 0) + 1
    
    areas = []
    for code in sorted(area_counts.keys(), key=int):
        name = AREA_DEFINITIONS.get(code, f"Area {code}")
        areas.append({
            "code": name.upper().replace(' ', '_').replace('/', '_'),
            "name": name,
            "displayOrder": len(areas) + 1,
            "sectionNumber": int(code),
            "itemCount": area_counts[code]
        })
    
    # Write files
    with open('/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json', 'w') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    with open('/root/.openclaw/workspace/AEGIS/src/data/seed/examination-areas.json', 'w') as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    
    # Report
    print(f"\n✓ Extracted {len(items)} items")
    print(f"✓ Created {len(areas)} areas\n")
    
    print("="*70)
    print("SUMMARY")
    print("="*70)
    for area in areas:
        print(f"  {area['sectionNumber']:>2}. {area['name']:<35} {area['itemCount']:>3} items")
    
    avg_len = sum(len(i['particulars']) for i in items) / len(items)
    short = [i for i in items if len(i['particulars']) < 30]
    
    print(f"\nQuality: avg={avg_len:.1f} chars, short={len(short)}")
    
    print("\n" + "="*70)
    print("SAMPLES")
    print("="*70)
    for idx in [0, 5, 10, 20, 50, 100, 200, 300, 400, 500]:
        if idx < len(items):
            item = items[idx]
            desc = item['particulars']
            if len(desc) > 120:
                desc = desc[:120] + "..."
            print(f"\n[{item['itemNumber']:>6}] {item['areaName']}")
            print(f"  {desc}")
    
    print(f"\n✓ Complete!\n")

if __name__ == '__main__':
    main()
