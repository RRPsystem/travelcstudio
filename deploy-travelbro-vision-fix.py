#!/usr/bin/env python3
import os
import json
from supabase import create_client

# Read environment variables
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    exit(1)

# Create Supabase client
supabase = create_client(url, key)

# Read all function files
function_dir = "/tmp/cc-agent/57777034/project/supabase/functions/travelbro-chat"
files_to_deploy = [
    "index.ts",
    "vision-tool.ts",
    "state-manager.ts",
    "tools.ts",
    "observability.ts",
    "response-formatter.ts",
    "format-trip-data.ts"
]

files = []
for filename in files_to_deploy:
    filepath = os.path.join(function_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()
        files.append({"name": filename, "content": content})

print(f"Deploying travelbro-chat with {len(files)} files...")

# Deploy using Supabase Management API
# Note: This uses the undocumented API, so may not work
import requests

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# Use the functions API endpoint
deploy_url = f"{url}/functions/v1/travelbro-chat"

# Create the deploy request
deploy_data = {
    "verify_jwt": False,
    "import_map": False,
    "entrypoint": "index.ts",
    "files": files
}

print(f"Deploying to {deploy_url}...")
response = requests.post(deploy_url, json=deploy_data, headers=headers)

if response.status_code in [200, 201]:
    print("✅ Deploy successful!")
    print(response.json())
else:
    print(f"❌ Deploy failed: {response.status_code}")
    print(response.text)
