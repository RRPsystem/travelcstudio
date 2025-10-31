import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadCSS() {
  console.log('🚀 Uploading CSS files to Supabase Storage...\n');

  const files = [
    { path: 'styles/main.css', bucket: 'assets', targetPath: 'styles/main.css' },
    { path: 'styles/components.css', bucket: 'assets', targetPath: 'styles/components.css' }
  ];

  let success = true;

  for (const file of files) {
    try {
      console.log(`📤 Uploading ${file.path}...`);

      const filePath = join(__dirname, '..', file.path);
      const fileContent = readFileSync(filePath, 'utf8');

      const { data, error } = await supabase.storage
        .from(file.bucket)
        .upload(file.targetPath, fileContent, {
          contentType: 'text/css',
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        if (error.message.includes('The resource already exists')) {
          console.log(`   ℹ️  File exists, updating...`);

          const { error: updateError } = await supabase.storage
            .from(file.bucket)
            .update(file.targetPath, fileContent, {
              contentType: 'text/css',
              cacheControl: '3600'
            });

          if (updateError) {
            console.error(`   ❌ Update failed: ${updateError.message}`);
            success = false;
          } else {
            console.log(`   ✅ Updated successfully`);
          }
        } else {
          console.error(`   ❌ Upload failed: ${error.message}`);
          success = false;
        }
      } else {
        console.log(`   ✅ Uploaded successfully`);
      }

      const { data: urlData } = supabase.storage
        .from(file.bucket)
        .getPublicUrl(file.targetPath);

      console.log(`   🔗 Public URL: ${urlData.publicUrl}`);
      console.log('');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      success = false;
    }
  }

  if (success) {
    console.log('✅ All CSS files uploaded successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Deploy the updated website-viewer edge function');
    console.log('   2. Test your pages at: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1/website-viewer'));
    console.log('');
  } else {
    console.log('❌ Some uploads failed. Please check the errors above.\n');
    process.exit(1);
  }
}

async function ensureBucketExists() {
  console.log('🔍 Checking if assets bucket exists...');

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    return false;
  }

  const assetsExists = buckets.some(bucket => bucket.name === 'assets');

  if (!assetsExists) {
    console.log('📦 Creating assets bucket...');

    const { data, error: createError } = await supabase.storage.createBucket('assets', {
      public: true,
      fileSizeLimit: 52428800
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError.message);
      console.log('\n💡 Please create the bucket manually in Supabase Dashboard:');
      console.log('   1. Go to Storage');
      console.log('   2. Click "Create bucket"');
      console.log('   3. Name: assets');
      console.log('   4. Public: Yes');
      console.log('   5. File size limit: 50MB\n');
      return false;
    }

    console.log('✅ Assets bucket created\n');
  } else {
    console.log('✅ Assets bucket exists\n');
  }

  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  AI TravelStudio - CSS Upload to Supabase Storage');
  console.log('='.repeat(60));
  console.log('');

  const bucketReady = await ensureBucketExists();

  if (!bucketReady) {
    console.log('❌ Assets bucket not ready. Please create it and try again.\n');
    process.exit(1);
  }

  await uploadCSS();
}

main().catch(console.error);
