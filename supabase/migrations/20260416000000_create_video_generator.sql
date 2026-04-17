-- ── Video Projects ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members can manage their video projects" ON video_projects;
CREATE POLICY "org members can manage their video projects"
  ON video_projects FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ── Generated Videos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES video_projects(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prompt           TEXT NOT NULL,
  status           TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
  operation_name   TEXT,
  video_url        TEXT,
  storage_path     TEXT,
  aspect_ratio     TEXT DEFAULT '16:9',
  resolution       TEXT DEFAULT '720p',
  duration_seconds INT DEFAULT 8,
  model            TEXT DEFAULT 'veo-3.1-generate-preview',
  first_frame_url  TEXT,
  last_frame_url   TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members can manage their generated videos" ON generated_videos;
CREATE POLICY "org members can manage their generated videos"
  ON generated_videos FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ── Project Images (for reuse) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_project_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES video_projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  url             TEXT NOT NULL,
  storage_path    TEXT,
  name            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_project_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members can manage project images" ON video_project_images;
CREATE POLICY "org members can manage project images"
  ON video_project_images FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ── Storage Bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "org members can upload videos" ON storage.objects;
CREATE POLICY "org members can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated can read videos" ON storage.objects;
CREATE POLICY "authenticated can read videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "uploader can delete videos" ON storage.objects;
CREATE POLICY "uploader can delete videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.uid() IS NOT NULL);
