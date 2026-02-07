// ============================================================================
// AEGIS Platform - Type Definitions
// ============================================================================
// This file defines all TypeScript interfaces for domain models used across
// the AEGIS audit platform. These types ensure type safety for demo data
// and provide autocomplete support throughout the application.
// ============================================================================

// ----------------------------------------------------------------------------
// Bank Profile Types
// ----------------------------------------------------------------------------

/**
 * Staff member within the bank organization
 */
export interface StaffMember {
  id: string
  name: string
  email: string
  role: 'director' | 'ceo' | 'manager' | 'auditor' | 'officer' | 'clerk'
  department: string
}

/**
 * Department within the bank
 */
export interface Department {
  id: string
  name: string
  head: string
}

/**
 * Bank branch location
 */
export interface Branch {
  id: string
  name: string
  code: string
  location: string
  manager: string
}

/**
 * Complete bank profile including organizational structure
 */
export interface BankProfile {
  id: string
  name: string
  shortName: string
  established: string // ISO 8601 date format
  branches: Branch[]
  departments: Department[]
  staff: StaffMember[]
}

// ----------------------------------------------------------------------------
// Compliance Types
// ----------------------------------------------------------------------------

/**
 * Compliance requirement derived from RBI circulars
 */
export interface ComplianceRequirement {
  id: string
  categoryId: string
  title: string
  description: string
  reference: string // RBI circular reference (e.g., "RBI/2023-24/117")
  status: 'compliant' | 'partial' | 'non-compliant' | 'pending'
  dueDate: string // ISO 8601 date format
  evidenceCount: number
  assignedTo: string
  createdAt: string // ISO 8601 date format
}

/**
 * Compliance calendar entry for tracking regulatory deadlines
 */
export interface ComplianceCalendar {
  id: string
  requirementId: string
  title: string
  dueDate: string // ISO 8601 date format
  status: 'upcoming' | 'due-soon' | 'overdue'
  priority: 'high' | 'medium' | 'low'
}

// ----------------------------------------------------------------------------
// Audit Types
// ----------------------------------------------------------------------------

/**
 * Type of audit to be conducted
 */
export type AuditType =
  | 'branch-audit'
  | 'is-audit'
  | 'credit-audit'
  | 'compliance-audit'
  | 'revenue-audit'

/**
 * Audit status tracking
 */
export type AuditStatus =
  | 'planned'
  | 'in-progress'
  | 'completed'
  | 'on-hold'
  | 'cancelled'

/**
 * Audit plan for scheduled audits
 */
export interface AuditPlan {
  id: string
  name: string
  type: AuditType
  branchId?: string
  departmentId?: string
  plannedStartDate: string // ISO 8601 date format
  plannedEndDate: string // ISO 8601 date format
  assignedTeam: string[]
  status: AuditStatus
  progress: number // 0-100 percentage
  createdAt: string // ISO 8601 date format
}

// ----------------------------------------------------------------------------
// Finding Types
// ----------------------------------------------------------------------------

/**
 * Severity level for audit findings
 */
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * Status of finding lifecycle
 */
export type FindingStatus =
  | 'draft'
  | 'submitted'
  | 'reviewed'
  | 'responded'
  | 'closed'

/**
 * Timeline entry for finding tracking
 */
export interface TimelineEntry {
  id: string
  date: string // ISO 8601 date format
  action: string
  actor: string
}

/**
 * Audit finding generated during audits
 */
export interface Finding {
  id: string
  auditId: string
  title: string
  category: string
  severity: FindingSeverity
  status: FindingStatus
  observation: string
  rootCause: string
  riskImpact: string
  auditeeResponse: string
  actionPlan: string
  assignedAuditor: string
  createdAt: string // ISO 8601 date format
  updatedAt: string // ISO 8601 date format
  timeline: TimelineEntry[]
}

// ----------------------------------------------------------------------------
// RBI Circular Types
// ----------------------------------------------------------------------------

/**
 * RBI circular reference for compliance mapping
 */
export interface RBICircular {
  id: string
  reference: string // e.g., "RBI/2023-24/117"
  date: string
  title: string
  category: 'Risk Management' | 'Governance' | 'Operations' | 'IT' | 'Credit' | 'Market Risk'
  pdfPath?: string
  requirementsExtracted: number
}

// ----------------------------------------------------------------------------
// Common Observation Types
// ----------------------------------------------------------------------------

/**
 * Common RBI observation pattern for finding generation
 */
export interface CommonObservation {
  id: string
  title: string
  category: 'governance' | 'operations' | 'credit' | 'IT' | 'compliance'
  description: string
  commonFor: string[] // Bank types/areas where this typically occurs
  reference: string // RBI circular reference
  severity: FindingSeverity
  rootCausePattern: string
  riskImpactDescription: string
  typicalActionPlan: string
}

// ----------------------------------------------------------------------------
// Utility Types
// ----------------------------------------------------------------------------

/**
 * Category for compliance requirements
 */
export type ComplianceCategory =
  | 'Governance'
  | 'Risk Management'
  | 'Compliance'
  | 'Operations'
  | 'IT'
  | 'Credit'
  | 'Treasury'
