-- Migration: Add GOOGLE_MAPS to ImportSource enum
-- Idempotent: safe to run multiple times

ALTER TYPE "ImportSource" ADD VALUE IF NOT EXISTS 'GOOGLE_MAPS';
