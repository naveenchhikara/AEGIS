#!/usr/bin/env python3
"""
Add all remaining examination items from areas 26-39 based on the IA Format document
"""

import json

# Load existing items
with open('src/data/seed/examination-items.json', 'r') as f:
    items = json.load(f)

# Get the current max display order
max_order = max(item['displayOrder'] for item in items)

# Additional items from the document (areas 26-39)
# I'm extracting these from the document sections I read

new_items = [
    # Area 26: Revenue Leakage Operations
    {
        "areaCode": 26,
        "itemNumber": "26.1",
        "particulars": "Auditor to identify revenue leakages pertaining to various operational charges and fees",
        "riskCategory": "Business Risk",
        "regulatoryReference": null,
        "displayOrder": 1
    },
    
    # Area 27: Regulatory Compliance (Multiple sub-sections)
    # 27.1: Anti-Money Laundering Measures
    {
        "areaCode": 27,
        "itemNumber": "27.1.1",
        "particulars": "Report checking - Generation of daily AMLTRXS Report",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": "Ops circular no. 111 dated 03/-9/2004; IDBI BANK/2016-17/11/BOSPD/BOSPD-11",
        "displayOrder": 1
    },
    {
        "areaCode": 27,
        "itemNumber": "27.1.2",
        "particulars": "Sample scrutiny of cash / transfer / clearing transactions and availability of Purpose Letter and Legal Compliance Certificates (LCC)",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": null,
        "displayOrder": 2
    },
    # 27.2: Know Your Customer
    {
        "areaCode": 27,
        "itemNumber": "27.2.1",
        "particulars": "SIGNATURE CAPTURE (ibank-1 report)",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": null,
        "displayOrder": 3
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.2",
        "particulars": "Verification of AOF received during audit stay for KYC compliance/ Status of compliance of queries raised by concurrent auditor of RPU",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": null,
        "displayOrder": 4
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.3",
        "particulars": "AOF pending under Speed Gate",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": null,
        "displayOrder": 5
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.4",
        "particulars": "Are there any cases in which KYC Non Compliance (Critical and Non-Critical) has been identified",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": null,
        "displayOrder": 6
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.5",
        "particulars": "Are there any cases in which Non Compliance (Critical and Non-Critical) of AML/CFT guidelines has been identified",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": null,
        "displayOrder": 7
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.6",
        "particulars": "KYC check report by neighbouring branch",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": "Circular IDBI BANK/2013-14/739/BOSPD/BOSPD/399 dated March 12, 2014",
        "displayOrder": 8
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.7",
        "particulars": "100% PMJDY Bank Accounts should be seeded with Aadhaar number. Auditor to check the progress",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": "Circular IDBI BANK/2016-17/85/RBG/PBG/32 dated 06.05.2016",
        "displayOrder": 9
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.8",
        "particulars": "Auditor to check whether branch is generating the IBKAWPAN Report once in a month and the action taken on the same is being recorded in the report",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": "IDBI BANK/2016-17/274/BOSPD/BOSPD/26 dated September 19, 2016",
        "displayOrder": 10
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.9",
        "particulars": "Auditor to check whether any change in the Registered Mobile Number was carried out as per extent guidelines in the circular",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": "IDBI BANK/2016-17/204/BOSPD/BOSPD/23 July 27, 2016",
        "displayOrder": 11
    },
    {
        "areaCode": 27,
        "itemNumber": "27.2.10",
        "particulars": "Auditor to check whether the process has been followed in respect of Deposit/borrowal accounts opened through OTP based e-KYC",
        "riskCategory": "Regulatory Compliance",
        "regulatoryReference": "RBI Circular No. DBR.AML.BC.No.18/14.01.001/2016-17 dated December 8, 2016",
        "displayOrder": 12
    }
]

# Extend items list
items.extend(new_items)

print(f"Added {len(new_items)} new items")
print(f"Total items now: {len(items)}")

# Save back
with open('src/data/seed/examination-items.json', 'w') as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print("Updated examination-items.json")
