ALTER TABLE raw_grade_sessions
  ADD COLUMN IF NOT EXISTS front_image_url text,
  ADD COLUMN IF NOT EXISTS back_image_url text,
  ADD COLUMN IF NOT EXISTS psa_prediction numeric(3,1),
  ADD COLUMN IF NOT EXISTS bgs_prediction numeric(3,1),
  ADD COLUMN IF NOT EXISTS cgc_prediction numeric(3,1),
  ADD COLUMN IF NOT EXISTS submission_company text,
  ADD COLUMN IF NOT EXISTS image_count int default 1;

-- Migrate existing image_url to front_image_url for consistency
UPDATE raw_grade_sessions SET front_image_url = image_url WHERE front_image_url IS NULL AND image_url IS NOT NULL;
