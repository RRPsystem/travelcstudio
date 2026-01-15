/*
  # Fix Security Definer Issues

  1. Changes
    - Remove SECURITY DEFINER from trips_with_share_url view (views don't need this)
    - Add search_path to increment_trip_views(uuid) function
    - Add search_path to update_question_discussion_count function
  
  2. Security
    - Prevents search_path attacks on SECURITY DEFINER functions
    - Views use caller's permissions instead of definer's
*/

-- Fix the view: recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.trips_with_share_url;

CREATE VIEW public.trips_with_share_url AS
SELECT 
  t.id,
  t.brand_id,
  t.title,
  t.slug,
  t.content,
  t.description,
  t.destination_id,
  t.price,
  t.duration_days,
  t.departure_dates,
  t.featured_image,
  t.gallery,
  t.status,
  t.published_at,
  t.created_at,
  t.updated_at,
  t.page_id,
  t.author_type,
  t.author_id,
  t.is_mandatory,
  t.enabled_for_brands,
  t.enabled_for_franchise,
  t.tc_idea_id,
  t.source,
  t.metadata,
  t.trip_type,
  t.share_token,
  t.share_domain,
  t.share_settings,
  get_trip_share_url(t.id) AS share_url,
  b.name AS brand_name,
  CASE
    WHEN t.trip_type = 'roadbook' THEN '📚 Roadbook'
    WHEN t.trip_type = 'offerte' THEN '💰 Offerte'
    WHEN t.trip_type = 'wordpress' THEN '📝 WordPress'
    WHEN t.trip_type = 'catalog' THEN '📖 Catalogus'
    ELSE '🎯 Custom'
  END AS type_label
FROM trips t
LEFT JOIN brands b ON b.id = t.brand_id;

-- Fix increment_trip_views(uuid) - add search_path
CREATE OR REPLACE FUNCTION public.increment_trip_views(trip_token uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_count int;
BEGIN
  UPDATE trips
  SET share_settings = jsonb_set(
    COALESCE(share_settings, '{}'::jsonb),
    '{view_count}',
    to_jsonb(COALESCE((share_settings->>'view_count')::int, 0) + 1)
  )
  WHERE share_token = trip_token
  RETURNING COALESCE((share_settings->>'view_count')::int, 1) INTO new_count;
  
  RETURN COALESCE(new_count, 1);
END;
$function$;

-- Fix update_question_discussion_count - add search_path
CREATE OR REPLACE FUNCTION public.update_question_discussion_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE podcast_questions
    SET discussion_count = discussion_count + 1
    WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE podcast_questions
    SET discussion_count = GREATEST(discussion_count - 1, 0)
    WHERE id = OLD.question_id;
  END IF;
  
  RETURN NULL;
END;
$function$;