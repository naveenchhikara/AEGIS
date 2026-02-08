// ============================================================================
// AEGIS Platform - Data Exports
// ============================================================================
// This file exports all regulation and demo data objects for use in the AEGIS platform
// ============================================================================

// RBI Regulations Data
export { regulations } from "./rbi-regulations/index";
export { chapters } from "./rbi-regulations/chapters";
export { definitions } from "./rbi-regulations/definitions";
export { capitalStructure } from "./rbi-regulations/capital-structure";
export { complianceRequirements } from "./rbi-regulations/compliance-requirements";

// Demo Data
export { default as bankProfile } from "./demo/bank-profile.json";
export { default as staff } from "./demo/staff.json";
export { default as branches } from "./demo/branches.json";
export { default as demoComplianceRequirements } from "./demo/compliance-requirements.json";
export { default as auditPlans } from "./demo/audit-plans.json";
export { default as findings } from "./demo/findings.json";
export { default as rbiCirculars } from "./demo/rbi-circulars.json";
