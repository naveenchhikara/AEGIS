# Sales Claim Remediation Options

This note translates the claims-audit findings into two choices per untrue
claim: **reword** the claim to match current reality, or **build** the missing
capability.

Human review owns final customer-facing wording.

## Decision matrix (from issue #48)

| Claim (as audited)                                                 | Current status | Recommended path now                                       | Draft wording option (human-final)                                                                                                                  |
| ------------------------------------------------------------------ | -------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Single-tenant on-premise deployment with zero cloud dependencies" | FALSE          | **Reword** (SaaS-only is already decided)                  | "AEGIS is a managed multi-tenant SaaS platform operated by Nexly Advisory for UCB internal-audit workflows."                                        |
| "Hash chain integrity"                                             | FALSE          | **Decision required**: reword now or commit a build ticket | Reword option: "AEGIS stores append-only audit events for covered tables with monotonic sequence numbers and operational monitoring for anomalies." |
| "2-hour implementation"                                            | FALSE          | **Reword** (until installer/automation exists)             | "Implementation is delivered through a guided onboarding runbook; timeline depends on environment readiness and security approvals."                |

## Hash-chain claim handling

Because auditors may specifically probe tamper evidence, treat this claim as a
product decision, not copy polish:

- **If we reword now:** keep language explicitly at current property level
  (append-only + sequence/anomaly monitoring), and avoid "hash chain" phrasing.
- **If we keep hash-chain language:** open and deliver a capability ticket for a
  real cryptographic chain (hash + previous-hash linkage, verification, and
  operational evidence).

Until that decision lands, do not publish "hash chain integrity" as a delivered
capability.
