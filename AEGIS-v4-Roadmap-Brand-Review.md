# Brand Review: AEGIS v4.0 Strategic Roadmap Deck

**Reviewed:** February 21, 2026
**Content:** 10-slide PowerPoint deck — AEGIS v4.0 4-Week Strategic Roadmap
**Competitor Reference:** eTHIC audit platform brochure, Audit Management Software System deck
**Review Type:** General brand review (no formal brand guide configured) + competitive positioning analysis

---

## Summary

**Overall Assessment:** The deck is technically solid and information-dense, but reads more like an _internal engineering status report_ than a _strategic product roadmap_ for external stakeholders or investors. The language leans heavily on developer jargon (NaN, DAL, Prisma, DB views, seed data), which undermines the executive authority that a banking/audit SaaS platform should project.

**Biggest Strengths:**
The visual design is clean and professional — the navy/ice blue palette conveys institutional trust, and the data hierarchy (stat cards, color-coded priority levels, Now/Next/Later framework) is well-structured and easy to scan. The 104/104 requirements metric on Slide 2 is a genuinely powerful proof point.

**Most Important Improvements:**
The deck needs a clear separation between internal engineering tasks and customer-facing value language. Both competitors (eTHIC and the Audit Management System) frame everything in terms of _bank outcomes_ — compliance readiness, inspection preparedness, risk visibility — never in terms of database models or deployment scripts. AEGIS should do the same to compete credibly.

---

## Detailed Findings

### Voice and Tone Issues

| #   | Issue                                                                                                                                                                                                                            | Location             | Severity   | Suggestion                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Developer jargon in executive slides** — Terms like "NaN", "DAL", "DB views", "Prisma migration", "seed data", "AWS SES sandbox" appear throughout. No bank CEO or board member knows what these mean.                         | Slides 3, 4, 5, 6, 7 | **High**   | Rewrite all task descriptions in outcome language. "Fix NaN" → "Correct dashboard calculations." "Re-run seed" → "Populate platform with demonstration data."                                                        |
| 2   | **Internal task framing, not strategic framing** — Slides 5-7 read like a Jira sprint board. Tasks like "Add DB views to Prisma migration/post-deploy" expose implementation details that erode confidence rather than build it. | Slides 5, 6, 7       | **High**   | Frame every row as a _business capability_ being delivered, not a _technical debt_ being fixed. A stakeholder sees "18 gaps" and thinks the product is broken — reframe as "18 enhancements for pilot optimization." |
| 3   | **"What Needs Attention" title is negative framing** — Slide 3's headline immediately shifts from the momentum of Slide 2 ("104 requirements complete!") to "here's what's wrong." Competitors never do this.                    | Slide 3              | **High**   | Reframe: "Pilot Readiness Roadmap" or "Path to Pilot Launch" — position gaps as a planned next phase, not a deficiency.                                                                                              |
| 4   | **Version numbering (v3.0 → v4.0) is internal-facing** — Customers don't care about internal version numbers. Both competitors describe capabilities, not version milestones.                                                    | Slides 1, 2, 10      | **Medium** | For external audiences: drop version numbers. "AEGIS Platform — Pilot Readiness Roadmap." For internal use: version numbers are fine.                                                                                |
| 5   | **Inconsistent product naming** — The deck uses "AEGIS", "RBIAS", and "Risk-Based Internal Audit System" interchangeably.                                                                                                        | Slides 1, 2          | **Medium** | Pick one: "AEGIS" is the brand name, "Risk-Based Internal Audit System" is the descriptor. Use consistently. Drop "RBIAS" — it's an acronym no one will remember.                                                    |
| 6   | **"Operational Blockers" section is alarming** — Listing 5 blockers with red bullets on Slide 3 makes the product sound fragile. "Most pages show empty states" is particularly damaging.                                        | Slide 3              | **High**   | If this deck goes to investors or pilot UCBs, remove this section entirely. For internal use, relabel: "Pre-Pilot Configuration Checklist."                                                                          |

### Competitive Positioning Gaps

| #   | Issue                                                                                                                                                                                                                                    | Location    | Severity   | Suggestion                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | **No product screenshots or UI visuals** — Both competitors use actual dashboard screenshots to build credibility. eTHIC shows real audit workflow screens. The Audit Management System deck shows 6+ dashboard views. AEGIS shows zero. | Entire deck | **High**   | Add 1-2 slides with actual platform screenshots — the dashboard, the audit execution view, the risk assessment matrix. This is the single biggest credibility gap vs. competitors.                                                       |
| 8   | **No customer/regulatory validation** — eTHIC references specific RBI circular numbers. The Audit Management System shows implementation case studies. AEGIS mentions "RBI RBIA compliance" but doesn't cite specific circulars.         | Slide 2     | **Medium** | Add specific regulatory references: "Aligned with RBI Master Direction on RBIA (DoS.CO.PPG/SEC.04/11.01.005/2020-21)" — this builds immediate credibility with UCB audiences.                                                            |
| 9   | **No differentiation statement** — The deck never explains _why AEGIS over eTHIC or other solutions_. What's the unique value? Multi-tenancy? Modern tech stack? Multi-language? Pricing?                                                | Missing     | **High**   | Add a "Why AEGIS" slide or integrate differentiation into Slide 2. Possible angles: cloud-native (vs. legacy on-premise), multi-language (vs. English-only), modern UX (vs. dated interfaces), SaaS pricing (vs. large upfront license). |
| 10  | **Pricing exposed without context** — Slide 8 shows "₹50K deposit" and "₹3-4L/year" without competitive anchoring. If competitors charge ₹10L+, this is a strength. If they charge ₹2L, it's a weakness.                                 | Slide 8     | **Medium** | Either add competitive pricing context ("40-60% below legacy solutions") or remove exact pricing from the deck and share it separately. Pricing in a strategic roadmap can anchor expectations prematurely.                              |

### Messaging and Positioning

| #   | Issue                                                                                                                                                                                                                            | Location | Severity   | Suggestion                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | **"63 Database Models" stat means nothing to the audience** — Slide 2 highlights 63 DB models as a key metric alongside requirements and modules. A bank CEO doesn't know what a database model is, and it doesn't signal value. | Slide 2  | **Medium** | Replace with a customer-meaningful stat: "52 Page Views" → "52 Workflow Screens" or "568 Examination Items" or "4 Languages Supported" — something the audience can relate to.               |
| 12  | **"17 RBAC Roles" needs translation** — RBAC is a technical acronym. The audience cares that their CEO, auditors, branch heads, and compliance officers each see the right information.                                          | Slide 2  | **Low**    | "17 User Roles — CEO to Field Auditor" communicates the same thing in human terms.                                                                                                           |
| 13  | **Pilot strategy lacks urgency and social proof** — Slide 8 describes the pilot stages clearly but doesn't create urgency or indicate demand.                                                                                    | Slide 8  | **Medium** | Add a line like "Limited to 3 pilot banks in Phase A" or "Currently in discussions with [X] UCBs" to create scarcity/validation.                                                             |
| 14  | **Success metrics are engineering metrics, not business metrics** — "0 NaN values" and "0 empty state pages" are QA metrics, not success metrics a stakeholder would track.                                                      | Slide 10 | **Medium** | Replace with business success metrics: "Complete audit cycle in under 2 hours", "100% RBI inspection readiness", "All 17 roles with personalized dashboards", "One-click report generation." |

### Style and Formatting

| #   | Issue                                                                                                                                                                                         | Location          | Severity   | Suggestion                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | **Mixed case in task names** — Some tasks use code-style naming ("WorkProgramItem execution UI", "IS_AUDITOR scoped access") which feels like copy-pasted Jira tickets, not polished content. | Slides 5, 6, 7    | **Medium** | Rewrite in natural language: "Work program test recording" instead of "WorkProgramItem execution UI (R56)." Remove requirement IDs (R56, R89, etc.) from external-facing versions. |
| 16  | **Requirement IDs (R2, R29, R56, etc.) are internal references** — These mean nothing to anyone outside the dev team and clutter the slides.                                                  | Slides 4, 5, 6, 7 | **Medium** | Remove for external audiences. Keep for internal engineering version only.                                                                                                         |
| 17  | **Date formats are inconsistent** — "Feb 21, 2026" on Slide 2, "February 2026" on Slide 1, "May 18, 2026" on Slide 9, "March 21, 2026" on Slide 10.                                           | Multiple slides   | **Low**    | Standardize: "February 2026" for months, "21 Feb 2026" or "February 21, 2026" for specific dates.                                                                                  |

### Legal and Compliance Flags

| #   | Issue                                                                                                                                                                                                        | Severity   | Recommendation                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| A   | **"Full RBI RBIA compliance" is an unsubstantiated claim** — Unless independently verified, claiming "full compliance" could be challenged. RBI compliance is assessed by RBI inspectors, not self-declared. | **High**   | Qualify: "Designed to support RBI RBIA framework requirements" or "Built in alignment with RBI RBIA guidelines." |
| B   | **Pricing commitment in a roadmap deck** — Showing "₹3-4L/year" in a deck that may be shared externally creates a pricing commitment that's hard to walk back.                                               | **Medium** | Add "indicative pricing, subject to final packaging" disclaimer, or move to a separate pricing document.         |
| C   | **"Pilot-Ready by March 21, 2026" is a specific commitment** — If shared externally, this becomes a delivery promise.                                                                                        | **Medium** | Soften to "Target: Pilot-Ready by Q1 2026" or add "internal target" qualifier.                                   |

---

## Top 5 Revised Sections (Before → After)

### 1. Slide 1 — Title Subtitle

**Before:** "Risk-Based Internal Audit System for UCBs"
**After:** "The modern audit platform built for Urban Cooperative Banks"

_Why: "System" sounds legacy. "Platform" is the category term both competitors avoid ceding. Adding "modern" creates implicit differentiation against older solutions._

### 2. Slide 2 — Stat Cards

**Before:** `104 Requirements Complete | 18 Modules Shipped | 63 Database Models | 17 RBAC Roles`
**After:** `104 Audit Requirements | 18 Functional Modules | 568 Examination Items | 17 User Roles`

_Why: Translates engineering metrics into domain language the audience recognizes._

### 3. Slide 3 — Title and Framing

**Before:** "What Needs Attention — 18 gaps across 5 phases + 5 operational issues blocking pilot readiness"
**After:** "Pilot Readiness Plan — 18 enhancements across 5 phases to prepare for UCB pilot launch"

_Why: Reframes from a problem statement to a proactive roadmap. "Enhancements" vs. "gaps" positions the work as planned iteration, not damage repair._

### 4. Slide 5 — Task Row Example

**Before:** "Null-safe aggregation in dashboard DAL — Dashboard shows correct numbers, no NaN"
**After:** "Dashboard calculation accuracy — All KPI widgets display verified, accurate figures"

_Why: Removes every engineering term (null-safe, aggregation, DAL, NaN) while preserving the substance._

### 5. Slide 10 — Success Metrics

**Before:** "0 Empty state pages — Every page shows meaningful data with production seed"
**After:** "Complete Audit Coverage — Every workflow screen populated with actionable data from Day 1"

_Why: Frames the same outcome in language a pilot bank would care about._

---

## Competitive Positioning Summary

| Dimension            | eTHIC                        | Audit Mgmt System           | AEGIS (Current)           | AEGIS (Recommended)                                   |
| -------------------- | ---------------------------- | --------------------------- | ------------------------- | ----------------------------------------------------- |
| **Visual proof**     | Dashboard screenshots        | 6+ screen captures          | None                      | Add 2-3 key screenshots                               |
| **Regulatory depth** | Cites specific RBI circulars | References RBI guidelines   | Generic "RBIA compliance" | Cite specific master directions                       |
| **Language**         | Bank-outcome focused         | Dashboard/analytics focused | Engineering-task focused  | Shift to bank-outcome language                        |
| **Differentiation**  | Established player           | Enterprise features         | Not articulated           | Cloud-native, multi-language, modern UX, SaaS pricing |
| **Audience**         | Bank management              | IT + audit teams            | Internal dev team         | Needs audience-specific versions                      |

---

## Recommendations

**Immediate (before sharing externally):**

1. Create two versions of this deck — an _internal engineering roadmap_ (keep as-is) and an _external stakeholder version_ (apply the changes above)
2. Add 1-2 slides with actual AEGIS screenshots showing the dashboard, audit workflow, and compliance tracking
3. Remove or qualify the "Full RBI RBIA compliance" claim
4. Remove requirement IDs and engineering jargon from the external version

**Short-term (within 1-2 weeks):** 5. Develop a formal brand voice document for AEGIS/Nexly Advisory to enforce consistency 6. Create a "Why AEGIS" competitive positioning slide that addresses eTHIC and other market solutions 7. Develop a separate one-page pricing sheet rather than embedding pricing in the roadmap

**Medium-term:** 8. Build a proper sales deck (separate from the roadmap) that leads with customer pain points, not feature lists 9. Collect at least one pilot testimonial or LOI to include as social proof 10. Document brand terminology guidelines (AEGIS, not RBIAS; platform, not system; user roles, not RBAC roles)
