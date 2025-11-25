-- Migration: Add missing columns to sensor_readings and reports tables
-- Run this on your Neon PostgreSQL database

-- ==========================================
-- Update sensor_readings table
-- ==========================================
ALTER TABLE sensor_readings
ADD COLUMN IF NOT EXISTS value NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ==========================================
-- Update reports table
-- ==========================================
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Create index on reports status
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sensor_readings'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;
