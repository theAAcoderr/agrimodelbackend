-- Notifications Table Migration
-- Run this to add notifications support

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  related_type VARCHAR(50),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

COMMENT ON TABLE notifications IS 'Stores user notifications';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error, announcement';
COMMENT ON COLUMN notifications.related_type IS 'Type of related entity: project, submission, user, etc.';
COMMENT ON COLUMN notifications.related_id IS 'ID of related entity';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
-- No updated_at column, so no trigger needed

-- Sample notification
INSERT INTO notifications (user_id, title, message, type)
SELECT id, 'Welcome to AgriModel!', 'Your account has been created successfully.', 'success'
FROM users
WHERE email = 'admin@agrimodel.com'
LIMIT 1
ON CONFLICT DO NOTHING;