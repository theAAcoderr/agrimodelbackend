-- Performance Indexes for AgriModel Database
-- This migration adds indexes to improve query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Colleges table indexes
CREATE INDEX IF NOT EXISTS idx_colleges_status ON colleges(status);
CREATE INDEX IF NOT EXISTS idx_colleges_college_code ON colleges(college_code);
CREATE INDEX IF NOT EXISTS idx_colleges_created_at ON colleges(created_at DESC);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_college_id ON projects(college_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);

-- Data Submissions table indexes
CREATE INDEX IF NOT EXISTS idx_data_submissions_project_id ON data_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_data_submissions_submitted_by ON data_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_data_submissions_status ON data_submissions(status);
CREATE INDEX IF NOT EXISTS idx_data_submissions_created_at ON data_submissions(created_at DESC);

-- Sensors table indexes
CREATE INDEX IF NOT EXISTS idx_sensors_project_id ON sensors(project_id);
CREATE INDEX IF NOT EXISTS idx_sensors_sensor_type ON sensors(sensor_type);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
CREATE INDEX IF NOT EXISTS idx_sensors_created_at ON sensors(created_at DESC);

-- Sensor Readings table indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_recorded ON sensor_readings(sensor_id, recorded_at DESC);

-- ML Models table indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_project_id ON ml_models(project_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_created_by ON ml_models(created_by);
CREATE INDEX IF NOT EXISTS idx_ml_models_model_type ON ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_created_at ON ml_models(created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);

-- Announcements table indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_target_role ON announcements(target_role);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Discussions table indexes
CREATE INDEX IF NOT EXISTS idx_discussions_project_id ON discussions(project_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_by ON discussions(created_by);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);

-- Discussion Replies table indexes
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user_id ON discussion_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_created_at ON discussion_replies(created_at DESC);

-- Research Data table indexes
CREATE INDEX IF NOT EXISTS idx_research_data_project_id ON research_data(project_id);
CREATE INDEX IF NOT EXISTS idx_research_data_submitted_by ON research_data(submitted_by);
CREATE INDEX IF NOT EXISTS idx_research_data_data_type ON research_data(data_type);
CREATE INDEX IF NOT EXISTS idx_research_data_created_at ON research_data(created_at DESC);

-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_college_role ON users(college_id, role) WHERE college_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_college_status ON projects(college_id, status);
CREATE INDEX IF NOT EXISTS idx_data_submissions_project_status ON data_submissions(project_id, status);

-- Full-text search indexes (if using PostgreSQL)
-- Uncomment if needed for search functionality
-- CREATE INDEX IF NOT EXISTS idx_projects_name_fts ON projects USING gin(to_tsvector('english', name));
-- CREATE INDEX IF NOT EXISTS idx_projects_description_fts ON projects USING gin(to_tsvector('english', description));