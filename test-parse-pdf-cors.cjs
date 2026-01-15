const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';

async function testCORS() {
  console.log('🟢 Testing parse-trip-pdf CORS...\n');

  const functionUrl = `${supabaseUrl}/functions/v1/parse-trip-pdf`;

  // Test 1: OPTIONS preflight
  console.log('1️⃣ Testing OPTIONS preflight request...');
  console.log('   URL:', functionUrl, '\n');

  try {
    const response = await fetch(functionUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.ai-travelstudio.nl',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });

    console.log('📊 OPTIONS Response:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   CORS Headers:');
    console.log('     Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('     Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    console.log('     Access-Control-Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
    console.log('     Access-Control-Max-Age:', response.headers.get('Access-Control-Max-Age'));

    if (response.status === 204 || response.status === 200) {
      console.log('\n✅ OPTIONS preflight succeeded!');
    } else {
      console.log('\n❌ OPTIONS preflight failed!');
    }

  } catch (error) {
    console.error('\n❌ OPTIONS request error:', error.message);
  }

  // Test 2: POST without auth (should fail with 401)
  console.log('\n2️⃣ Testing POST without authentication...');

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.ai-travelstudio.nl',
      },
      body: JSON.stringify({ pdfUrl: 'test.pdf' }),
    });

    console.log('📊 POST Response (no auth):');
    console.log('   Status:', response.status, response.statusText);

    const text = await response.text();
    console.log('   Body:', text.substring(0, 200));

    if (response.status === 401) {
      console.log('\n✅ Correctly returns 401 without auth!');
    } else {
      console.log('\n❌ Unexpected status code');
    }

  } catch (error) {
    console.error('\n❌ POST request error:', error.message);
  }

  // Test 3: Check if function is deployed and reachable
  console.log('\n3️⃣ Testing if function is deployed...');

  try {
    const response = await fetch(functionUrl.replace('/parse-trip-pdf', '/'), {
      method: 'GET',
    });

    console.log('📊 Base functions URL:');
    console.log('   Status:', response.status);

  } catch (error) {
    console.error('\n❌ Base URL error:', error.message);
  }
}

testCORS().catch(console.error);
