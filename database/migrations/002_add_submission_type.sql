-- Migration: Add submission_type column to data_submissions table
-- Run this on your Neon PostgreSQL database

ALTER TABLE data_submissions
ADD COLUMN IF NOT EXISTS submission_type VARCHAR(100) DEFAULT 'comprehensive_research';

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'data_submissions'
ORDER BY ordinal_position;
