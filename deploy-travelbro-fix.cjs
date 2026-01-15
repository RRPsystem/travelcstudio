const fs = require('fs');
const path = require('path');
const https = require('https');

// Read environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Function directory
const functionDir = '/tmp/cc-agent/57777034/project/supabase/functions/travelbro-chat';

// Files to deploy
const filesToDeploy = [
  'index.ts',
  'vision-tool.ts',
  'state-manager.ts',
  'tools.ts',
  'observability.ts',
  'response-formatter.ts',
  'format-trip-data.ts'
];

console.log('📦 Reading function files...');

// Read all files
const files = filesToDeploy.map(filename => {
  const filepath = path.join(functionDir, filename);
  const content = fs.readFileSync(filepath, 'utf8');
  return { name: filename, content };
});

console.log(`✅ Read ${files.length} files`);
console.log('🚀 Deploying to Supabase...');

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Supabase Management API endpoint
const deployUrl = `https://api.supabase.com/v1/projects/${projectRef}/functions/travelbro-chat`;

const payload = JSON.stringify({
  slug: 'travelbro-chat',
  name: 'travelbro-chat',
  verify_jwt: false,
  import_map: false,
  entrypoint_path: 'index.ts',
  body: files.map(f => ({ name: f.name, source: f.content }))
});

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN || SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(deployUrl, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Deploy successful!');
      console.log(data);
    } else {
      console.error(`❌ Deploy failed: ${res.statusCode}`);
      console.error(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
});

req.write(payload);
req.end();
