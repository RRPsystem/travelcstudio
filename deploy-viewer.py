#!/usr/bin/env python3
import subprocess
import sys

# Read the file
with open('supabase/functions/website-viewer/index.ts', 'r') as f:
    content = f.read()

# Use supabase CLI via npx
result = subprocess.run([
    'npx', '-y', 'supabase', 'functions', 'deploy', 'website-viewer',
    '--no-verify-jwt',
    '--project-ref', 'huaaogdxxdcakxryecnw'
], env={**subprocess.os.environ, 'SUPABASE_ACCESS_TOKEN': subprocess.os.environ.get('SUPABASE_ACCESS_TOKEN', '')})

sys.exit(result.returncode)
