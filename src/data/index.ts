// Data exports for RBI regulations and compliance content
// This file exports all regulation data objects for use in the AEGIS platform

// RBI Regulations Data
export { regulations } from './rbi-regulations/index.json';
export { chapters } from './rbi-regulations/chapters.json';
export { definitions } from './rbi-regulations/definitions.json';
export { capitalStructure } from './rbi-regulations/capital-structure.json';
export { complianceRequirements } from './rbi-regulations/compliance-requirements.json';

// Type re-exports for convenience
export type { RBICircular, ComplianceRequirement } from '../types';
