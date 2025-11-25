-- AgriModel Database Schema for Neon PostgreSQL
-- Complete schema matching Flutter app models

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. COLLEGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  college_code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colleges_status ON colleges(status);
CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(college_code);

-- ==========================================
-- 2. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) UNIQUE NOT NULL, -- For auth compatibility
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
  department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT true,
  profile_image_url TEXT,
  phone_number VARCHAR(20),
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_college ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ==========================================
-- 3. PROJECTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'PLANNING',
  department VARCHAR(100),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  team_members UUID[] DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- ==========================================
-- 4. DATA SUBMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS data_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  data_content JSONB NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  file_urls TEXT[] DEFAULT '{}',
  audio_urls TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  quality_score NUMERIC(3,2),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON data_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project ON data_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON data_submissions(status);

-- ==========================================
-- 5. SENSORS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  configuration JSONB DEFAULT '{}',
  last_reading TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensors_project ON sensors(project_id);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);

-- ==========================================
-- 6. SENSOR READINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  soil_moisture NUMERIC(5,2),
  ph_level NUMERIC(4,2),
  light_intensity NUMERIC(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_sensor ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings(timestamp);

-- ==========================================
-- 7. ML MODELS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  framework VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT',
  version VARCHAR(50) DEFAULT '1.0.0',
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  hyperparameters JSONB DEFAULT '{}',
  metrics JSONB,
  training_config JSONB DEFAULT '{}',
  deployment_config JSONB DEFAULT '{}',
  model_path TEXT,
  accuracy NUMERIC(5,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  trained_at TIMESTAMP,
  deployed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_models_project ON ml_models(project_id);
CREATE INDEX IF NOT EXISTS idx_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_models_created_by ON ml_models(created_by);

-- ==========================================
-- 8. REPORTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL,
  file_path TEXT,
  file_url TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recipients UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);

-- ==========================================
-- 9. CONVERSATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  type VARCHAR(50) DEFAULT 'direct',
  participant_ids UUID[] NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP DEFAULT NOW(),
  unread_counts JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);

-- ==========================================
-- 10. MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  attachments TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ==========================================
-- 11. ANNOUNCEMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(50) DEFAULT 'medium',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  target_roles TEXT[] DEFAULT '{}',
  target_colleges UUID[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  read_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);

-- ==========================================
-- 12. DISCUSSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  participants UUID[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussions_project ON discussions(project_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_by ON discussions(created_by);

-- ==========================================
-- 13. DISCUSSION REPLIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}',
  is_solution BOOLEAN DEFAULT false,
  liked_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON discussion_replies(parent_reply_id);

-- ==========================================
-- 14. RESEARCH DATA TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  data_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  file_urls TEXT[] DEFAULT '{}',
  audio_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_data_project ON research_data(project_id);
CREATE INDEX IF NOT EXISTS idx_research_data_user ON research_data(user_id);

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to auto-generate college code
CREATE OR REPLACE FUNCTION generate_college_code()
RETURNS TRIGGER AS $$
DECLARE
  next_code INTEGER;
  new_code VARCHAR(50);
BEGIN
  IF NEW.college_code IS NULL OR NEW.college_code = '' THEN
    -- Get the highest existing code number
    SELECT COALESCE(MAX(CAST(SUBSTRING(college_code FROM 4) AS INTEGER)), 0) + 1
    INTO next_code
    FROM colleges
    WHERE college_code ~ '^CLG[0-9]+$';
    
    -- Generate new code
    new_code := 'CLG' || LPAD(next_code::TEXT, 3, '0');
    NEW.college_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for college code generation
DROP TRIGGER IF EXISTS trigger_generate_college_code ON colleges;
CREATE TRIGGER trigger_generate_college_code
  BEFORE INSERT ON colleges
  FOR EACH ROW
  EXECUTE FUNCTION generate_college_code();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_colleges_updated_at ON colleges;
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_submissions_updated_at ON data_submissions;
CREATE TRIGGER update_data_submissions_updated_at BEFORE UPDATE ON data_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sensors_updated_at ON sensors;
CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ml_models_updated_at ON ml_models;
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discussions_updated_at ON discussions;
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discussion_replies_updated_at ON discussion_replies;
CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON discussion_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_research_data_updated_at ON research_data;
CREATE TRIGGER update_research_data_updated_at BEFORE UPDATE ON research_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INITIAL DATA - Super Admin User
-- ==========================================
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (id, user_id, name, email, password_hash, role, status, is_active)
VALUES (
  uuid_generate_v4(),
  'super_admin_001',
  'Super Admin',
  'admin@agrimodel.com',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'super_admin',
  'approved',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- VIEWS FOR ANALYTICS
-- ==========================================

-- User statistics view
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  role,
  status,
  COUNT(*) as count,
  college_id
FROM users
GROUP BY role, status, college_id;

-- Project statistics view
CREATE OR REPLACE VIEW project_statistics AS
SELECT
  type,
  status,
  department,
  COUNT(*) as count,
  created_by
FROM projects
GROUP BY type, status, department, created_by;

-- Data submission statistics view
CREATE OR REPLACE VIEW submission_statistics AS
SELECT
  student_id,
  project_id,
  status,
  COUNT(*) as count,
  AVG(quality_score) as avg_quality
FROM data_submissions
GROUP BY student_id, project_id, status;

COMMENT ON TABLE colleges IS 'Stores college/university information';
COMMENT ON TABLE users IS 'Stores user accounts with role-based access';
COMMENT ON TABLE projects IS 'Stores agricultural research projects';
COMMENT ON TABLE data_submissions IS 'Stores student data submissions for projects';
COMMENT ON TABLE sensors IS 'Stores IoT sensor information';
COMMENT ON TABLE sensor_readings IS 'Stores time-series sensor data';
COMMENT ON TABLE ml_models IS 'Stores machine learning model configurations';
COMMENT ON TABLE reports IS 'Stores generated reports and exports';
COMMENT ON TABLE conversations IS 'Stores conversation metadata';
COMMENT ON TABLE messages IS 'Stores individual messages in conversations';
COMMENT ON TABLE announcements IS 'Stores system-wide announcements';
COMMENT ON TABLE discussions IS 'Stores discussion forum topics';
COMMENT ON TABLE discussion_replies IS 'Stores replies to discussions';
COMMENT ON TABLE research_data IS 'Stores research data entries';

