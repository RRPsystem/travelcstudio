const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDY2OTAsImV4cCI6MjA3OTI2NjY5MH0.ygqwQNOpbJqe9NHtlxLCIlmVk2j5Mkcw4qvMpkGyeY0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testParsePDF() {
  console.log('🟢 Testing parse-trip-pdf with debug logging...\n');

  // Login first - try multiple users
  console.log('1️⃣ Trying to login...');

  const credentials = [
    { email: 'operator@travel.com', password: 'operator123' },
    { email: 'delmonde@brand.nl', password: 'delmonde123' },
    { email: 'golf@brand.nl', password: 'golf123' },
  ];

  let authData = null;
  let authError = null;

  for (const cred of credentials) {
    console.log(`   Trying ${cred.email}...`);
    const result = await supabase.auth.signInWithPassword(cred);

    if (!result.error) {
      authData = result.data;
      console.log(`   ✅ Success with ${cred.email}`);
      break;
    } else {
      console.log(`   ❌ Failed: ${result.error.message}`);
      authError = result.error;
    }
  }

  if (!authData) {
    console.error('\n❌ All login attempts failed!');
    console.log('Please create a test user or provide valid credentials\n');
    return;
  }

  console.log('✅ Logged in successfully');
  console.log('   User ID:', authData.user.id);
  console.log('   Email:', authData.user.email);
  console.log('   Access Token (first 50 chars):', authData.session.access_token.substring(0, 50) + '...\n');

  // Test with a fake PDF URL
  const testPdfUrl = 'https://huaaogdxxdcakxryecnw.supabase.co/storage/v1/object/public/travel-documents/test.pdf';

  console.log('2️⃣ Calling parse-trip-pdf function...');
  console.log('   PDF URL:', testPdfUrl);
  console.log('   Function URL:', `${supabaseUrl}/functions/v1/parse-trip-pdf\n`);

  try {
    const startTime = Date.now();

    const response = await fetch(`${supabaseUrl}/functions/v1/parse-trip-pdf`, {
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
    console.log('   Content-Type:', response.headers.get('Content-Type'));
    console.log('   Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'), '\n');

    const responseText = await response.text();

    console.log('📦 Response body:');
    console.log('─────────────────────────────────────────────────────');

    try {
      const data = JSON.parse(responseText);
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log(responseText);
    }

    console.log('─────────────────────────────────────────────────────\n');

    if (response.ok) {
      console.log('✅ Function call succeeded!');
      const data = JSON.parse(responseText);
      if (data.debug) {
        console.log('\n🐛 Debug info:');
        console.log('   Request ID:', data.debug.requestId);
        console.log('   User ID:', data.debug.userId);
        console.log('   Processing time:', data.debug.processingTime);
      }
    } else {
      console.log('❌ Function call failed!');
      console.log('   Status:', response.status);

      try {
        const error = JSON.parse(responseText);
        if (error.debug) {
          console.log('\n🐛 Debug info:');
          console.log('   Request ID:', error.debug.requestId);
          if (error.debug.errorName) {
            console.log('   Error name:', error.debug.errorName);
          }
          if (error.debug.stack) {
            console.log('   Stack trace:', error.debug.stack);
          }
        }
      } catch (e) {
        // Not JSON or no debug info
      }
    }

    console.log('\n💡 To see detailed server logs:');
    console.log('   1. Go to https://supabase.com/dashboard/project/huaaogdxxdcakxryecnw');
    console.log('   2. Click "Edge Functions" in left menu');
    console.log('   3. Click "parse-trip-pdf"');
    console.log('   4. Click "Logs" tab');
    console.log('   5. Look for the Request ID from the debug info above');

  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    console.error('   This usually means:');
    console.error('   - CORS issue (but we handle that)');
    console.error('   - Function not deployed');
    console.error('   - Network timeout');
    console.error('   - DNS issues\n');

    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

testParsePDF().catch(console.error);
