const fs = require('fs');

async function updatePage() {
  const html = fs.readFileSync('gowild-home-clean.html', 'utf8');
  
  console.log('📤 Calling update-page-html function with', html.length, 'bytes...');
  
  const response = await fetch('https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/update-page-html', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI'
    },
    body: JSON.stringify({
      page_id: '14ca10f1-a5d4-4067-841a-8337ebc8c5e8',
      html_content: html
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ SUCCESS! Page updated:', result.page.title);
    console.log('📏 HTML size:', result.html_size, 'bytes');
    console.log('');
    console.log('🔄 Now refresh the page in BOLT to see the GoWild template!');
  } else {
    console.error('❌ Error:', result.error);
  }
}

updatePage().catch(console.error);
