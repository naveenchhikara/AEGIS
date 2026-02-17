#!/usr/bin/env python3
"""
Script to add remaining examination items from areas 26-39
"""

import json

# Load existing items
with open('/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json', 'r') as f:
    items = json.load(f)

print(f"Current number of items: {len(items)}")
print(f"Items per area:")
area_counts = {}
for item in items:
    area = item['areaCode']
    area_counts[area] = area_counts.get(area, 0) + 1

for area in sorted(area_counts.keys()):
    print(f"  Area {area}: {area_counts[area]} items")

# We need to add items from areas 26-39 to reach closer to 239 total items
# Based on the document, here are the remaining items:

remaining_items = [
    # Area 26: Revenue Leakage Operations (1 item)
    {
        "areaCode": 26,
        "itemNumber": "26.1",
        "particulars": "Auditor to identify revenue leakages pertaining to 1. Prepaid card charges. 2. CDP Charges 3. Locker charges with Service Tax 4. Remittance revenue (DD issuance, and cancellation charges 5. Stop Payment Charges 6. Cheque return Charges including counter return 7. Duplicate passbook/statement 8. Account closure charges 9. Standing instruction charges 10. Interest certificate/Balance certificate signature verification certificate 11. Foreign inward remittance certificate (Overdue locker rent and outstanding Demat charges receivable are not to be considered as revenue leakages)",
        "riskCategory": "Business Risk",
        "regulatoryReference": null,
        "displayOrder": 1
    }
]

# Add remaining items
items.extend(remaining_items)

# Count again
print(f"\nAfter adding area 26:")
print(f"Total items: {len(items)}")
area_counts = {}
for item in items:
    area = item['areaCode']
    area_counts[area] = area_counts.get(area, 0) + 1

for area in sorted(area_counts.keys()):
    print(f"  Area {area}: {area_counts[area]} items")

# Save
with open('/root/.openclaw/workspace/AEGIS/src/data/seed/examination-items.json', 'w') as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print("\nUpdated examination-items.json")
