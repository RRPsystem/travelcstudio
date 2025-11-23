const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://huaaogdxxdcakxryecnw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function fixPreviewUrl() {
  const { data, error } = await supabase
    .from('builder_categories')
    .update({ 
      preview_url: 'https://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png'
    })
    .eq('category_slug', 'gowild')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Updated:', data);
  }
}

fixPreviewUrl();
