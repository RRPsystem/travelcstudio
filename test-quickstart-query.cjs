const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://huaaogdxxdcakxryecnw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI'
);

async function testQuery() {
  const { data, error } = await supabase
    .from('quickstart_templates')
    .select(`
      id,
      display_name,
      description,
      selected_pages,
      category:builder_categories!category_id(
        id,
        category_slug,
        display_name,
        preview_url
      )
    `)
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Query result:', JSON.stringify(data, null, 2));
  }
}

testQuery();
