const https = require('https');

const testDomains = [
  'reisbureau-del-monde.ai-travelstudio.nl',
  'test-subdomain.ai-travelstudio.nl',
  'www.ai-travelstudio.nl'
];

async function checkSSL(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'GET',
      rejectUnauthorized: true
    };

    const req = https.request(options, (res) => {
      console.log(`✅ ${domain}: SSL OK (${res.statusCode})`);
      resolve(true);
    });

    req.on('error', (e) => {
      console.log(`❌ ${domain}: ${e.message}`);
      resolve(false);
    });

    req.end();
  });
}

(async () => {
  console.log('🔍 Checking SSL certificates...\n');

  for (const domain of testDomains) {
    await checkSSL(domain);
  }

  console.log('\n✨ Done!');
})();
