const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src/components/Brand');
const files = [
  'AgentManagement.tsx',
  'BrandSettings.tsx',
  'DestinationApproval.tsx',
  'DomainSettings.tsx',
  'FooterBuilder.tsx',
  'MenuBuilder.tsx',
  'NewPage.tsx',
  'NewsApproval.tsx',
  'PageManagement.tsx',
  'QuickStart.tsx',
  'QuickStartWebsite.tsx',
  'RoadmapBoard.tsx',
  'SocialMediaManager.tsx',
  'TripApproval.tsx'
];

files.forEach(filename => {
  const filePath = path.join(componentsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filename} - file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file uses useAuth
  if (!content.includes('useAuth()')) {
    console.log(`⚠️  Skipping ${filename} - doesn't use useAuth()`);
    return;
  }

  // Check if already has effectiveBrandId
  if (content.includes('effectiveBrandId')) {
    console.log(`✅ Skipping ${filename} - already has effectiveBrandId`);
    return;
  }

  // Replace user?.brand_id and user.brand_id with effectiveBrandId
  const originalContent = content;
  content = content.replace(/user\?\.brand_id/g, 'effectiveBrandId');
  content = content.replace(/user\.brand_id/g, 'effectiveBrandId');

  if (content !== originalContent) {
    modified = true;
  }

  // Add effectiveBrandId to useAuth() destructuring
  const useAuthPattern = /const\s*\{\s*([^}]+)\s*\}\s*=\s*useAuth\(\)/;
  const match = content.match(useAuthPattern);

  if (match) {
    const currentProps = match[1];
    if (!currentProps.includes('effectiveBrandId')) {
      const newProps = currentProps.trim() + ', effectiveBrandId';
      content = content.replace(useAuthPattern, `const { ${newProps} } = useAuth()`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${filename}`);
  } else {
    console.log(`⚠️  No changes needed for ${filename}`);
  }
});

console.log('\n✅ Done! All Brand components updated.');
