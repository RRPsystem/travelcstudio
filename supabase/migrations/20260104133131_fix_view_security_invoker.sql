/*
  # Fix View Security with SECURITY INVOKER

  1. Changes
    - Recreate trips_with_share_url view with explicit SECURITY INVOKER
    - This ensures the view uses the caller's permissions, not the creator's
  
  2. Security
    - Explicitly sets SECURITY INVOKER to prevent security advisor warnings
    - View will use the permissions of the user querying it
*/

-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.trips_with_share_url;

CREATE VIEW public.trips_with_share_url
WITH (security_invoker = true)
AS
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