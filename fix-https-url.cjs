const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://huaaogdxxdcakxryecnw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI'
);

async function fixUrl() {
  console.log('Updating preview URL from HTTP to HTTPS...');
  
  const { data: current, error: readError } = await supabase
    .from('builder_categories')
    .select('category_slug, preview_url')
    .eq('category_slug', 'gowild')
    .single();
  
  if (readError) {
    console.error('Read error:', readError);
    return;
  }
  
  console.log('Current URL:', current.preview_url);
  
  const { data, error } = await supabase
    .from('builder_categories')
    .update({ 
      preview_url: 'https://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png'
    })
    .eq('category_slug', 'gowild')
    .select();

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('✅ Updated successfully!');
    console.log('New URL:', data[0].preview_url);
  }
}

fixUrl();
