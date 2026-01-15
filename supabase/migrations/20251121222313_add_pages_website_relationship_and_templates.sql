/*
  # Add Pages-Website Relationship and Template System
  
  1. Changes to Pages Table
    - Add `website_id` column (FK to websites)
    - Change `show_in_menu` default to true
    - Add index for website_id
    
  2. New Template Pages Table
    - `id` (uuid, primary key)
    - `template_category` (text) - e.g., 'GoWild', 'Tripex'
    - `page_name` (text) - e.g., 'home', 'about', 'tours', 'contact'
    - `title` (text) - Display title
    - `slug` (text) - URL slug
    - `content` (text) - HTML content
    - `menu_order` (integer) - Default order
    - `created_at` (timestamp)
    
  3. Data
    - Insert GoWild template pages (Home, About, Tours, Contact)
    
  4. Security
    - Enable RLS on template_pages
    - Allow public read access (templates are public)
*/

-- Add website_id to pages table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pages' AND column_name = 'website_id'
  ) THEN
    ALTER TABLE pages ADD COLUMN website_id uuid REFERENCES websites(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_pages_website_id ON pages(website_id);
  END IF;
END $$;

-- Update show_in_menu default to true
ALTER TABLE pages ALTER COLUMN show_in_menu SET DEFAULT true;

-- Create template_pages table
CREATE TABLE IF NOT EXISTS template_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_category text NOT NULL,
  page_name text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  menu_order integer NOT NULL DEFAULT 0,
  preview_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(template_category, page_name)
);

-- Enable RLS
ALTER TABLE template_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to template pages
CREATE POLICY "Template pages are publicly readable"
  ON template_pages FOR SELECT
  TO public
  USING (true);

-- Allow operators to manage template pages
CREATE POLICY "Operators can manage template pages"
  ON template_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Insert GoWild template pages
INSERT INTO template_pages (template_category, page_name, title, slug, content, menu_order, preview_image_url)
VALUES 
  (
    'GoWild',
    'home',
    'Home',
    '/',
    '<div style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px;">
      <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
        <h1 style="font-size: 3.5rem; font-weight: bold; margin-bottom: 1.5rem;">Welcome to GoWild Adventures</h1>
        <p style="font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.9;">Experience the thrill of a lifetime with our curated adventure tours</p>
        <button style="background: white; color: #667eea; padding: 15px 40px; border: none; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer;">Explore Tours</button>
      </div>
      <div style="margin-top: 80px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px);">
          <h3 style="font-size: 1.5rem; margin-bottom: 15px;">🏔️ Mountain Trekking</h3>
          <p style="opacity: 0.9;">Conquer majestic peaks and breathe in the fresh mountain air</p>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px);">
          <h3 style="font-size: 1.5rem; margin-bottom: 15px;">🌊 Ocean Adventures</h3>
          <p style="opacity: 0.9;">Dive into crystal-clear waters and explore marine wonders</p>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px);">
          <h3 style="font-size: 1.5rem; margin-bottom: 15px;">🌲 Jungle Expeditions</h3>
          <p style="opacity: 0.9;">Discover hidden trails and exotic wildlife in lush rainforests</p>
        </div>
      </div>
    </div>',
    1,
    'http://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png'
  ),
  (
    'GoWild',
    'about',
    'About Us',
    '/about',
    '<div style="min-height: 100vh; background: white; padding: 60px 20px;">
      <div style="max-width: 1000px; margin: 0 auto;">
        <h1 style="font-size: 3rem; font-weight: bold; color: #667eea; margin-bottom: 2rem; text-align: center;">About GoWild Adventures</h1>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;">
          <div>
            <p style="font-size: 1.2rem; line-height: 1.8; color: #333; margin-bottom: 1.5rem;">
              For over 15 years, GoWild Adventures has been leading travelers on unforgettable journeys to the world''s most spectacular destinations.
            </p>
            <p style="font-size: 1.2rem; line-height: 1.8; color: #333; margin-bottom: 1.5rem;">
              Our expert guides and carefully crafted itineraries ensure that every adventure is safe, exciting, and truly transformative.
            </p>
            <p style="font-size: 1.2rem; line-height: 1.8; color: #333;">
              Join thousands of satisfied adventurers who have discovered the thrill of exploring the wild with us.
            </p>
          </div>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 40px; color: white;">
            <h3 style="font-size: 2rem; margin-bottom: 1.5rem;">Why Choose Us?</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 1rem; font-size: 1.1rem;">✓ Expert local guides</li>
              <li style="margin-bottom: 1rem; font-size: 1.1rem;">✓ Small group sizes</li>
              <li style="margin-bottom: 1rem; font-size: 1.1rem;">✓ Sustainable tourism</li>
              <li style="margin-bottom: 1rem; font-size: 1.1rem;">✓ 24/7 support</li>
              <li style="font-size: 1.1rem;">✓ Best price guarantee</li>
            </ul>
          </div>
        </div>
      </div>
    </div>',
    2,
    'http://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png'
  ),
  (
    'GoWild',
    'tours',
    'Our Tours',
    '/tours',
    '<div style="min-height: 100vh; background: #f5f5f5; padding: 60px 20px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h1 style="font-size: 3rem; font-weight: bold; color: #667eea; margin-bottom: 3rem; text-align: center;">Explore Our Tours</h1>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px;">
          <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div style="height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
            <div style="padding: 25px;">
              <h3 style="font-size: 1.5rem; color: #333; margin-bottom: 10px;">Himalayan Heights</h3>
              <p style="color: #666; margin-bottom: 15px;">14-day trekking adventure through Nepal''s stunning mountain ranges</p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1.5rem; font-weight: bold; color: #667eea;">$2,499</span>
                <button style="background: #667eea; color: white; padding: 10px 25px; border: none; border-radius: 20px; cursor: pointer;">View Details</button>
              </div>
            </div>
          </div>
          <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div style="height: 200px; background: linear-gradient(135deg, #06beb6 0%, #48b1bf 100%);"></div>
            <div style="padding: 25px;">
              <h3 style="font-size: 1.5rem; color: #333; margin-bottom: 10px;">Caribbean Dive</h3>
              <p style="color: #666; margin-bottom: 15px;">7-day scuba diving expedition in the crystal-clear Caribbean waters</p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1.5rem; font-weight: bold; color: #06beb6;">$1,899</span>
                <button style="background: #06beb6; color: white; padding: 10px 25px; border: none; border-radius: 20px; cursor: pointer;">View Details</button>
              </div>
            </div>
          </div>
          <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div style="height: 200px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);"></div>
            <div style="padding: 25px;">
              <h3 style="font-size: 1.5rem; color: #333; margin-bottom: 10px;">Amazon Wilderness</h3>
              <p style="color: #666; margin-bottom: 15px;">10-day guided trek through the Amazon rainforest ecosystem</p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1.5rem; font-weight: bold; color: #11998e;">$2,199</span>
                <button style="background: #11998e; color: white; padding: 10px 25px; border: none; border-radius: 20px; cursor: pointer;">View Details</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>',
    3,
    'http://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png'
  ),
  (
    'GoWild',
    'contact',
    'Contact Us',
    '/contact',
    '<div style="min-height: 100vh; background: white; padding: 60px 20px;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 3rem; font-weight: bold; color: #667eea; margin-bottom: 2rem; text-align: center;">Get In Touch</h1>
        <p style="font-size: 1.2rem; text-align: center; color: #666; margin-bottom: 3rem;">Ready to start your adventure? Contact us today!</p>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 40px; color: white;">
          <form style="display: flex; flex-direction: column; gap: 20px;">
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">Name</label>
              <input type="text" style="width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 1rem;" placeholder="Your name">
            </div>
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">Email</label>
              <input type="email" style="width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 1rem;" placeholder="your@email.com">
            </div>
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">Message</label>
              <textarea style="width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 1rem; min-height: 150px; resize: vertical;" placeholder="Tell us about your dream adventure..."></textarea>
            </div>
            <button type="submit" style="background: white; color: #667eea; padding: 15px 40px; border: none; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-top: 10px;">Send Message</button>
          </form>
        </div>
        <div style="margin-top: 50px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; text-align: center;">
          <div>
            <div style="font-size: 2rem; margin-bottom: 10px;">📧</div>
            <h4 style="color: #667eea; margin-bottom: 8px;">Email</h4>
            <p style="color: #666;">info@gowild.com</p>
          </div>
          <div>
            <div style="font-size: 2rem; margin-bottom: 10px;">📞</div>
            <h4 style="color: #667eea; margin-bottom: 8px;">Phone</h4>
            <p style="color: #666;">+1 (555) 123-4567</p>
          </div>
          <div>
            <div style="font-size: 2rem; margin-bottom: 10px;">📍</div>
            <h4 style="color: #667eea; margin-bottom: 8px;">Office</h4>
            <p style="color: #666;">123 Adventure St, Wild City</p>
          </div>
        </div>
      </div>
    </div>',
    4,
    'http://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png'
  )
ON CONFLICT (template_category, page_name) DO NOTHING;
