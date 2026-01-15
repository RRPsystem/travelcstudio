const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Service role key heeft volledige toegang
const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYzNjczMywiZXhwIjoyMDc0MjEyNzMzfQ.gTZOfARuX4hP_-WP3K8iYZJu_DkEZLfKHwf0pRlx-R0';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updatePage() {
  const html = fs.readFileSync('gowild-home-clean.html', 'utf8');
  
  console.log('📤 Updating page with', html.length, 'bytes of HTML...');
  
  const { data, error } = await supabase
    .from('pages')
    .update({ 
      body_html: html,
      updated_at: new Date().toISOString()
    })
    .eq('id', '14ca10f1-a5d4-4067-841a-8337ebc8c5e8')
    .select('id, title');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Update successful!');
  
  // Verify
  const { data: verify } = await supabase
    .from('pages')
    .select('id, title')
    .eq('id', '14ca10f1-a5d4-4067-841a-8337ebc8c5e8')
    .single();
  
  console.log('📄 Page:', verify.title);
  
  // Check size via raw SQL
  const { data: sizeData } = await supabase.rpc('exec_sql', {
    sql: "SELECT LENGTH(body_html) as size FROM pages WHERE id = '14ca10f1-a5d4-4067-841a-8337ebc8c5e8'"
  }).catch(() => {
    // If RPC doesn't exist, just report success
    return { data: null };
  });
  
  if (sizeData) {
    console.log('📏 HTML size:', sizeData);
  } else {
    console.log('✅ Update complete! Refresh BOLT to see the template.');
  }
}

updatePage().catch(console.error);
