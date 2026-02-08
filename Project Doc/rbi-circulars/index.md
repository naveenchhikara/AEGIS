# RBI Circulars Index

This directory serves as a catalog for all Reserve Bank of India (RBI) circulars relevant to Urban Cooperative Bank (UCB) compliance. Each circular is mapped to specific compliance requirements that can be tracked in the AEGIS platform.

## Directory Structure

```
Project Doc/rbi-circulars/
├── index.md                    # This file - catalog and mapping index
├── pdfs/                       # Store actual RBI circular PDFs here
│   ├── risk-management/        # Risk Management circulars
│   ├── governance/             # Governance circulars
│   ├── operations/             # Operations circulars
│   ├── it/                     # IT/Information Security circulars
│   ├── credit/                 # Credit circulars
│   └── market-risk/            # Market Risk circulars
└── extracted-requirements/     # JSON files with extracted requirements
    └── {circular-id}.json      # Individual requirement extractions
```

## Circular Categories

| Category            | Description                                                     | Typical Compliance Areas                                |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| **Risk Management** | Basel III, risk-based supervision, asset liability management   | Risk monitoring, capital adequacy, risk committee       |
| **Governance**      | Board composition, fit & proper, related party transactions     | Board oversight, director appointments, disclosure      |
| **Operations**      | KYC, AML, customer service, grievance redressal                 | Customer onboarding, transaction monitoring, complaints |
| **IT**              | Information security, cyber resilience, business continuity     | IT controls, data protection, DR/BCP testing            |
| **Credit**          | Loan classification, NPAs, provisioning, credit appraisal       | Credit assessment, asset quality, loan monitoring       |
| **Market Risk**     | Interest rate risk, liquidity management, investment guidelines | Treasury operations, investment portfolio, ALM          |

## Circular to Requirements Mapping

### Format

| Circular ID     | Title          | Date       | Category | Mapped Requirements   |
| --------------- | -------------- | ---------- | -------- | --------------------- |
| RBI/YYYY-NN/### | Circular Title | YYYY-MM-DD | Category | REQ-001, REQ-002, ... |

### Sample Entries

| Circular ID     | Title                                | Date       | Category        | Mapped Requirements            |
| --------------- | ------------------------------------ | ---------- | --------------- | ------------------------------ |
| RBI/2023-24/117 | Governance in UCBs - Directors       | 2023-08-15 | Governance      | GOV-001, GOV-002, GOV-005      |
| RBI/2023-24/098 | Risk Management and Internal Control | 2023-06-22 | Risk Management | RISK-001, RISK-003, RISK-007   |
| RBI/2022-23/245 | Cyber Security Framework             | 2022-12-01 | IT              | IT-001, IT-002, IT-004, IT-008 |
| RBI/2023-24/056 | NPA Norms and Asset Classification   | 2023-04-10 | Credit          | CR-001, CR-002, CR-003         |
| RBI/2023-24/089 | KYC/AML Guidelines                   | 2023-05-28 | Operations      | OPS-001, OPS-002, OPS-004      |
| RBI/2022-23/178 | ALM and Liquidity Management         | 2022-09-15 | Market Risk     | MR-001, MR-002                 |

## Requirement ID Convention

```
{CATEGORY}-{NUMBER}

Examples:
- GOV-001: Board composition requirements
- RISK-003: Risk-based supervision guidelines
- IT-004: Information security controls
- CR-002: NPA classification norms
```

## Adding New Circulars

1. **Download PDF** from RBI website (https://www.rbi.org.in)
2. **Place in category folder** under `pdfs/{category}/`
3. **Extract requirements** into JSON format in `extracted-requirements/`
4. **Update this index** with circular ID, title, and mapped requirement IDs
5. **Update compliance data** in `/src/data/compliance-requirements.json`

## Key RBI Circulars for UCBs (Reference)

Below are commonly referenced circulars for Urban Cooperative Banks:

### Governance

- **UCB Directions**: Master directions on governance in UCBs
- **Fit and Proper**: Criteria for board appointments
- **RPT Norms**: Related Party Transactions disclosure

### Risk Management

- **RBS Framework**: Risk Based Supervision guidelines
- **Basel III**: Capital adequacy and disclosure norms
- **ORM**: Operational Risk Management requirements

### IT & Security

- **Cyber Security**: Baseline cyber security controls
- **BCP/DR**: Business Continuity Planning framework
- **IT Examination**: IT inspection guidelines

### Credit & Operations

- **KYC/AML**: Customer identification procedures
- **NPA Norms**: Asset classification and provisioning
- **Customer Service**: Grievance redressal mechanism

## Notes

- This index is a catalog. Actual PDFs will be added as required during development
- Requirement IDs are auto-generated during the compliance requirement creation process
- Each circular may map to multiple compliance requirements
- Some requirements may derive from multiple circulars (many-to-many relationship)

## References

- RBI Circulars: https://www.rbi.org.in/scripts/BS_ViewCircumstances.aspx
- UCB Guidelines: `UCB Guidelines by RBI.pdf` (project root)
- Compliance Requirements: `/src/data/compliance-requirements.json` (to be created)
