const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDY2OTAsImV4cCI6MjA3OTI2NjY5MH0.ygqwQNOpbJqe9NHtlxLCIlmVk2j5Mkcw4qvMpkGyeY0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testParsePDF() {
  console.log('🟢 Starting parse-trip-pdf test...\n');

  // Login as brand user
  console.log('1️⃣ Logging in as brand@test.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'brand@test.com',
    password: 'brand123',
  });

  if (authError) {
    console.error('❌ Login failed:', authError.message);
    return;
  }

  console.log('✅ Logged in successfully');
  console.log('   User ID:', authData.user.id);
  console.log('   Access Token:', authData.session.access_token.substring(0, 50) + '...\n');

  // Test PDF URL (we gebruiken een publieke PDF URL voor test)
  const testPdfUrl = 'https://huaaogdxxdcakxryecnw.supabase.co/storage/v1/object/public/travel-documents/test.pdf';

  console.log('2️⃣ Calling parse-trip-pdf function...');
  console.log('   PDF URL:', testPdfUrl);

  const functionUrl = `${supabaseUrl}/functions/v1/parse-trip-pdf`;
  console.log('   Function URL:', functionUrl, '\n');

  try {
    const startTime = Date.now();

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify({ pdfUrl: testPdfUrl }),
    });

    const duration = Date.now() - startTime;

    console.log('📊 Response received in', duration, 'ms');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()), '\n');

    const responseText = await response.text();
    console.log('📦 Response body (first 500 chars):');
    console.log(responseText.substring(0, 500));

    if (response.ok) {
      console.log('\n✅ Function call succeeded!');
      const data = JSON.parse(responseText);
      console.log('   Parsed data keys:', Object.keys(data));
    } else {
      console.log('\n❌ Function call failed!');
      console.log('   Status:', response.status);
      console.log('   Error:', responseText);
    }

  } catch (error) {
    console.error('\n❌ Fetch error:', error.message);
    console.error('   Full error:', error);

    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

testParsePDF().catch(console.error);
