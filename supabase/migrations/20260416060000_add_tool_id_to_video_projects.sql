-- Add tool_id column to video_projects to distinguish between 'video-generator' and 'longa-metragem' tools
ALTER TABLE video_projects
  ADD COLUMN IF NOT EXISTS tool_id TEXT DEFAULT NULL;

-- Create video_generations as an alias view for backward compatibility
-- (LongVideoStudio uses video_generations table, which is actually generated_videos)
-- Instead, we'll just ensure generated_videos has the needed columns for LongVideoStudio
ALTER TABLE generated_videos
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;

ALTER TABLE generated_videos
  ADD COLUMN IF NOT EXISTS order_index INT DEFAULT NULL;

-- Create a view 'video_generations' pointing to generated_videos
-- so LongVideoStudio can use it
CREATE OR REPLACE VIEW video_generations AS
  SELECT
    id,
    project_id,
    organization_id,
    created_by,
    prompt,
    status,
    operation_name,
    video_url,
    storage_path,
    aspect_ratio,
    resolution,
    duration_seconds,
    model,
    first_frame_url AS thumbnail_url,
    last_frame_url,
    error_message,
    created_at,
    completed_at,
    order_index
  FROM generated_videos;
