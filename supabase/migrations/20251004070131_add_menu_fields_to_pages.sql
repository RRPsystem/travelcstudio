/*
  # Add Menu Fields to Pages Table

  Adds fields needed for menu generation from pages.

  ## Changes
    - Add `show_in_menu` (boolean) - whether page should appear in menu
    - Add `menu_label` (text) - optional custom label for menu (defaults to title)
    - Add `parent_slug` (text) - slug of parent page for hierarchical menus
    - Add `menu_order` (integer) - display order in menu
    - Add index on parent_slug for performance
    - Add index on menu_order for performance

  ## Notes
    - Default show_in_menu to false for existing pages
    - Default menu_order to 0 for existing pages
    - parent_slug is nullable (null = top-level page)
    - menu_label is nullable (null = use page title)
*/

-- Add menu-related columns
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS show_in_menu boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS menu_label text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_slug text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS menu_order integer DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_show_in_menu ON pages(show_in_menu) WHERE show_in_menu = true;
CREATE INDEX IF NOT EXISTS idx_pages_parent_slug ON pages(parent_slug) WHERE parent_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_menu_order ON pages(brand_id, menu_order) WHERE show_in_menu = true;