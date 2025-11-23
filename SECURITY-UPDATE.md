# 🚨 SECURITY ISSUE - Hardcoded Service Role Keys

**STATUS**: KRITIEK - Service Role Key is gelekt naar GitHub

## Getroffen Bestanden:
- update-with-service-role.cjs
- update-gowild-page.cjs
- call-update-function.cjs
- sync-gowild-template.cjs
- test-quickstart-query.cjs
- sync-gowild-templates-to-db.cjs
- fix-https-url.cjs
- fix-preview-url.cjs

## Onmiddellijke Actie Vereist:

### 1. Reset Supabase Service Role Key
1. Ga naar https://supabase.com/dashboard
2. Project Settings → API
3. Klik "Reset" bij Service Role Key
4. Update de key in je lokale .env bestand

### 2. Update alle scripts
Alle scripts moeten de key uit environment variables halen:

```javascript
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}
```

### 3. .gitignore Check
Zorg dat deze bestanden NIET in git komen:
- .env
- .env.local
- *.cjs (development scripts)
- **/*.key

### 4. GitHub Secrets
Voor CI/CD, gebruik GitHub Secrets:
- Settings → Secrets → Actions
- Add: SUPABASE_SERVICE_ROLE_KEY

## Preventie:
- Gebruik ALTIJD environment variables
- Commit NOOIT keys naar git
- Gebruik .env bestanden (in .gitignore)
- Review commits voor secrets
