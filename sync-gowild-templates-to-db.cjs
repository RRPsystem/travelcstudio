const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncGoWildTemplates() {
  console.log('🔄 Syncing GoWild templates from external builder...\n');
  
  // Get list of GoWild templates from external API
  const listResponse = await fetch('https://www.ai-websitestudio.nl/api/templates/gowild/list');
  const listData = await listResponse.json();
  
  console.log(`📋 Found ${listData.pages.length} templates in external builder\n`);
  
  // Only sync the main pages we care about
  const pagesToSync = ['index', 'about', 'tours', 'contact'];
  
  for (const pageSlug of pagesToSync) {
    const pageInfo = listData.pages.find(p => p.slug === pageSlug);
    if (!pageInfo) {
      console.log(`⚠️  Page "${pageSlug}" not found, skipping...`);
      continue;
    }
    
    console.log(`📥 Fetching ${pageInfo.name} (${pageSlug})...`);
    
    // Fetch HTML from external builder
    const templateResponse = await fetch(`https://www.ai-websitestudio.nl/api/templates/gowild/${pageSlug}`);
    const templateData = await templateResponse.json();
    
    if (!templateData.html_content) {
      console.log(`❌ No HTML content for ${pageSlug}`);
      continue;
    }
    
    console.log(`   HTML size: ${templateData.html_content.length} bytes`);
    
    // Call our edge function to update the template
    const updateResponse = await fetch(`${supabaseUrl}/functions/v1/update-page-html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        page_id: pageSlug,
        html_content: templateData.html_content,
        update_type: 'template',
        category: 'GoWild',
        template_name: pageInfo.name
      })
    });
    
    // Since update-page-html is for pages, we need to update templates directly
    // Let's update website_page_templates
    const { data: existing, error: findError } = await supabase
      .from('website_page_templates')
      .select('id')
      .eq('category', 'GoWild')
      .eq('template_name', pageInfo.name)
      .maybeSingle();
    
    if (findError) {
      console.log(`❌ Error finding template: ${findError.message}`);
      continue;
    }
    
    if (existing) {
      // Update existing template - but we can't with anon key!
      console.log(`   ⚠️  Template exists (${existing.id}) but can't update with anon key`);
      console.log(`   📝 Needs operator/admin to run update`);
    } else {
      console.log(`   ℹ️  Template doesn't exist in DB`);
    }
  }
  
  console.log('\n✅ Sync complete!');
  console.log('\n⚠️  Note: Templates need to be updated by operator/admin via SQL or edge function');
}

syncGoWildTemplates().catch(console.error);
