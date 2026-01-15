const fs = require('fs');

async function syncTemplate() {
  const html = fs.readFileSync('gowild-home-clean.html', 'utf8');
  
  const response = await fetch('https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/sync-from-builder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI'
    },
    body: JSON.stringify({
      page_id: '14ca10f1-a5d4-4067-841a-8337ebc8c5e8',
      builder_url: 'https://www.ai-websitestudio.nl',
      category: 'gowild',
      page_slug: 'index',
      html_content: html
    })
  });

  const result = await response.json();
  console.log('Result:', result);
}

syncTemplate().catch(console.error);
