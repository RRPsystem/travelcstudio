-- ============================================
-- WordPress Pages Cache + Change Requests
-- ============================================

-- Cache of WordPress pages per brand
CREATE TABLE IF NOT EXISTS wordpress_pages_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  wordpress_page_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  edit_url TEXT NOT NULL DEFAULT '',
  elementor_edit_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'publish',
  template TEXT DEFAULT '',
  modified_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, wordpress_page_id)
);

-- RLS
ALTER TABLE wordpress_pages_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can view own pages cache"
  ON wordpress_pages_cache FOR SELECT
  USING (brand_id = (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Service role can manage pages cache"
  ON wordpress_pages_cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- Change requests from brands to admin/operator
CREATE TABLE IF NOT EXISTS wordpress_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  page_id UUID REFERENCES wordpress_pages_cache(id) ON DELETE SET NULL,
  page_title TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL DEFAULT 'change' CHECK (request_type IN ('change', 'new_page', 'delete', 'other')),
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'rejected')),
  admin_notes TEXT,
  requested_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE wordpress_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can view own change requests"
  ON wordpress_change_requests FOR SELECT
  USING (brand_id = (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can create change requests"
  ON wordpress_change_requests FOR INSERT
  WITH CHECK (brand_id = (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Service role can manage change requests"
  ON wordpress_change_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wp_pages_cache_brand ON wordpress_pages_cache(brand_id);
CREATE INDEX IF NOT EXISTS idx_wp_change_requests_brand ON wordpress_change_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_wp_change_requests_status ON wordpress_change_requests(status);
