const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const html = fs.readFileSync('gowild-home-clean.html', 'utf8');
const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePage() {
  console.log('Updating page with HTML of', html.length, 'bytes...');
  
  const { data, error } = await supabase
    .from('pages')
    .update({ 
      body_html: html
    })
    .eq('id', '14ca10f1-a5d4-4067-841a-8337ebc8c5e8')
    .select('id, title');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Success! Page updated');
    
    // Verify
    const { data: verify } = await supabase
      .from('pages')
      .select('id, title, body_html')
      .eq('id', '14ca10f1-a5d4-4067-841a-8337ebc8c5e8')
      .single();
    
    console.log('Verified HTML size:', verify.body_html.length, 'bytes');
  }
}

updatePage().catch(console.error);
