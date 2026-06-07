-- ============================================
-- Migration: Tạo bảng image_jobs và automation_settings
-- Chạy SQL này trên Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Bảng image_jobs - Lưu trữ các job tạo ảnh
CREATE TABLE IF NOT EXISTS image_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'WAITING'
    CHECK (status IN ('WAITING', 'RUNNING', 'SUCCESS', 'FAILED', 'PAUSED')),
  chatgpt_image_url TEXT,
  result_image_path TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng automation_settings - Lưu cấu hình automation
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  chatgpt_email TEXT,
  chatgpt_password TEXT,
  delay_between_jobs INTEGER DEFAULT 5,        -- phút
  delay_after_send INTEGER DEFAULT 60,         -- giây
  max_retries INTEGER DEFAULT 3,
  rest_after_n_jobs INTEGER DEFAULT 5,
  rest_duration_minutes INTEGER DEFAULT 30,
  login_method TEXT DEFAULT 'email' CHECK (login_method IN ('email', 'google')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON image_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON image_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON image_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON image_jobs FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON automation_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON automation_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON automation_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Indexes
CREATE INDEX idx_image_jobs_user_id ON image_jobs(user_id);
CREATE INDEX idx_image_jobs_status ON image_jobs(status);
CREATE INDEX idx_image_jobs_created_at ON image_jobs(created_at DESC);

-- 5. Cập nhật bảng hiện có (nếu đã tạo trước đó)
ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS login_method TEXT DEFAULT 'email' CHECK (login_method IN ('email', 'google'));
