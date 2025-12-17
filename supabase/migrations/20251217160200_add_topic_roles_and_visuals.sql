/*
  # Add Topic Roles and Visual Settings

  1. Changes to `podcast_topics`
    - Add `interviewer_id` - Guest acting as interviewer for this topic
    - Add `leading_id` - Guest who is the main lead/focus for this topic
    - Add `sidekick_id` - Guest acting as sidekick for this topic
    - Add `show_visuals` - Boolean to indicate if visual material should be shown
    
  2. Security
    - All fields are optional (nullable)
    - Foreign keys reference podcast_guests table
    - No RLS changes needed (inherits from existing policies)
*/

-- Add role and visual fields to podcast_topics
ALTER TABLE podcast_topics
  ADD COLUMN IF NOT EXISTS interviewer_id uuid REFERENCES podcast_guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS leading_id uuid REFERENCES podcast_guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sidekick_id uuid REFERENCES podcast_guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_visuals boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_podcast_topics_interviewer ON podcast_topics(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_podcast_topics_leading ON podcast_topics(leading_id);
CREATE INDEX IF NOT EXISTS idx_podcast_topics_sidekick ON podcast_topics(sidekick_id);