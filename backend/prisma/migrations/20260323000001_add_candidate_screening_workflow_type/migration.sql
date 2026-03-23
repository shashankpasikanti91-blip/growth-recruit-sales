-- Migration: Add CANDIDATE_SCREENING to WorkflowType enum
-- Date: 2026-03-23
-- Safe: Adding a new enum value is backward compatible

ALTER TYPE "WorkflowType" ADD VALUE IF NOT EXISTS 'CANDIDATE_SCREENING';
