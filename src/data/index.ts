// Data exports for RBI regulations and compliance content
// This file exports all regulation data objects for use in the AEGIS platform

// RBI Regulations Data
export { regulations } from './rbi-regulations/index';
export { chapters } from './rbi-regulations/chapters';
export { definitions } from './rbi-regulations/definitions';
export { capitalStructure } from './rbi-regulations/capital-structure';
export { complianceRequirements } from './rbi-regulations/compliance-requirements';

// Type re-exports for convenience
export type { RBICircular, ComplianceRequirement } from '../types';
