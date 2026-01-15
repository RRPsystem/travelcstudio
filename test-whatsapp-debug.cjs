const https = require('https');

// Het telefoonnummer van je WhatsApp test (zonder + en zonder "whatsapp:")
const PHONE_NUMBER = '31611725801'; // Pas dit aan naar jouw nummer

const SUPABASE_URL = 'https://yypruyrcihpvqcaicaig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cHJ1eXJjaWhwdnFjYWljYWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc0NDA0NjIsImV4cCI6MjA0MzAxNjQ2Mn0.hF5obuY7pxUN0PyrqLH0jCWcmb9HdvYc2dTOXjQ3xjk';

console.log('🔍 Debug TravelBro WhatsApp voor nummer:', PHONE_NUMBER);
console.log('');

const data = JSON.stringify({
  phoneNumber: PHONE_NUMBER
});

const options = {
  hostname: 'yypruyrcihpvqcaicaig.supabase.co',
  port: 443,
  path: '/functions/v1/debug-travelbro-whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('');

    try {
      const result = JSON.parse(body);

      console.log('📊 DEBUG RAPPORT:');
      console.log('='.repeat(60));
      console.log('');

      if (result.summary) {
        console.log('📋 SAMENVATTING:');
        console.log('  Session gevonden:', result.summary.sessionFound ? '✅ JA' : '❌ NEE');
        console.log('  Trip gevonden:', result.summary.tripFound ? '✅ JA' : '❌ NEE');
        console.log('  Telefoonnummer:', result.summary.phoneNumber);
        console.log('  Trip naam:', result.summary.tripName || 'n/a');
        console.log('  Bro Status:', result.summary.broStatus || 'n/a');
        console.log('');
      }

      if (result.debugLog) {
        console.log('📝 GEDETAILLEERDE LOG:');
        console.log('');

        result.debugLog.forEach((log, index) => {
          console.log(`Step ${log.step}: ${log.action || log.status || 'Unknown'}`);

          if (log.status) {
            const icon = log.status === 'SUCCESS' ? '✅' :
                        log.status === 'ERROR' ? '❌' :
                        log.status === 'NOT FOUND' ? '⚠️' : '📍';
            console.log(`  Status: ${icon} ${log.status}`);
          }

          if (log.error) {
            console.log(`  ❌ Error: ${log.error}`);
          }

          if (log.message) {
            console.log(`  💬 ${log.message}`);
          }

          if (log.session) {
            console.log('  Session info:');
            console.log('    ID:', log.session.id);
            console.log('    Phone:', log.session.phone_number);
            console.log('    Trip ID:', log.session.trip_id);
          }

          if (log.trip) {
            console.log('  Trip info:');
            console.log('    ID:', log.trip.id);
            console.log('    Name:', log.trip.name);
            console.log('    Brand ID:', log.trip.brand_id);
            console.log('    Status:', log.trip.bro_status);
            console.log('    GPT Model:', log.trip.gpt_model);
          }

          if (log.httpStatus) {
            const icon = log.httpStatus === 200 ? '✅' : '❌';
            console.log(`  ${icon} HTTP Status: ${log.httpStatus} ${log.httpStatusText}`);
          }

          if (log.fullResponse) {
            console.log('  📄 Full Error Response:');
            console.log('  ' + log.fullResponse.substring(0, 300));
          }

          if (log.parsedResponse) {
            console.log('  ✅ Response parsed successfully');
            if (log.parsedResponse.text) {
              console.log('  Response preview:', log.parsedResponse.text.substring(0, 100) + '...');
            }
          }

          if (log.sessions) {
            console.log('  Available sessions:');
            log.sessions.forEach(s => {
              console.log(`    - ${s.phone_number} → Trip ${s.trip_id}`);
            });
          }

          if (log.availableApis) {
            console.log('  APIs configured:');
            log.availableApis.forEach(api => {
              console.log(`    ✅ ${api}`);
            });
          }

          console.log('');
        });
      }

      if (result.error) {
        console.log('❌ FOUT:');
        console.log('  ', result.error);
        console.log('');
      }

      console.log('='.repeat(60));

    } catch (e) {
      console.log('❌ Kon response niet parsen als JSON');
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(data);
req.end();
