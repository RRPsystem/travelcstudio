# CSS Deployment Instructions

## Overzicht
Deze instructies helpen je om CSS styling toe te voegen aan dynamisch gerenderde pagina's via de `website-viewer` edge function.

---

## Stap 1: Upload CSS naar Supabase Storage

### Optie A: Via Supabase Dashboard (Aanbevolen)

1. **Open je Supabase Project Dashboard**
   - Ga naar: https://supabase.com/dashboard/project/[jouw-project-id]

2. **Ga naar Storage**
   - Klik in het linkermenu op "Storage"

3. **Maak de Assets Bucket**
   - Klik op "Create bucket"
   - Vul in:
     - **Name:** `assets`
     - **Public bucket:** ✅ **Ja** (belangrijk!)
     - **File size limit:** 50 MB
     - **Allowed MIME types:** Leave empty (all types)
   - Klik "Create bucket"

4. **Maak de Styles Folder**
   - Open de `assets` bucket
   - Klik "New folder"
   - Naam: `styles`
   - Klik "Create folder"

5. **Upload CSS Files**
   - Open de `styles` folder
   - Klik "Upload file"
   - Upload: `styles/main.css`
   - Upload: `styles/components.css`

6. **Verifieer URLs**
   - Klik op een geüploade file
   - Kopieer de "Public URL"
   - Zou moeten zijn: `https://[project].supabase.co/storage/v1/object/public/assets/styles/main.css`

### Optie B: Via Upload Script (Automatisch)

1. **Controleer Environment Variables**
   ```bash
   # Check je .env file
   cat .env | grep SUPABASE
   ```

   Moet bevatten:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Run Upload Script**
   ```bash
   npm run upload-css
   ```

3. **Controleer Output**
   - ✅ = Success
   - ❌ = Error (zie foutmelding)

---

## Stap 2: Deploy Website-Viewer Edge Function

### Vereisten
- Supabase CLI geïnstalleerd
- Project gelinkt

### Deploy Commando

```bash
# Check of je bent ingelogd
supabase projects list

# Als niet ingelogd:
supabase login

# Link project (indien nog niet gedaan)
supabase link --project-ref [jouw-project-ref]

# Deploy de edge function
supabase functions deploy website-viewer
```

### Verwacht Output
```
Deploying website-viewer (project: [project-name])
Bundled website-viewer
Deployed website-viewer
```

---

## Stap 3: Test De Setup

### Test URL
```
https://[jouw-project].supabase.co/functions/v1/website-viewer?brand_id=[brand-uuid]
```

### Wat Te Checken

1. **Open de Test URL in je browser**

2. **Open Developer Tools (F12)**
   - Ga naar "Network" tab
   - Refresh de pagina (Ctrl+R)

3. **Check CSS Loading**
   - Zoek naar: `main.css`
   - Zoek naar: `components.css`
   - Status moet zijn: **200 OK**
   - Type moet zijn: **text/css**

4. **Check Styling**
   - ✅ Hero sections hebben overlays
   - ✅ Fonts laden correct (Inter)
   - ✅ Media rows hebben smooth scrolling
   - ✅ Layout is responsive

### Debug Als Het Niet Werkt

#### CSS Files 404 Error
```bash
# Check of bucket public is
# Dashboard → Storage → assets → Settings → Public access: ON
```

#### CSS Laadt Niet
```bash
# Check edge function logs
supabase functions logs website-viewer --tail

# Check of URL correct is
echo $VITE_SUPABASE_URL
```

#### Styling Werkt Niet
```bash
# Clear browser cache
Ctrl + Shift + R (hard refresh)

# Check CSS inhoud direct
curl https://[project].supabase.co/storage/v1/object/public/assets/styles/main.css
```

---

## Stap 4: Updates Maken (Later)

### CSS Updaten

1. **Wijzig lokale CSS files**
   - Edit: `styles/main.css`
   - Edit: `styles/components.css`

2. **Upload naar Supabase**
   ```bash
   npm run upload-css
   ```

   Of via Dashboard:
   - Upload files opnieuw (overwrite existing)

3. **Clear Cache**
   - Browser: Ctrl + Shift + R
   - Of: Wacht 1 uur (cache expiry)

### Edge Function Updaten

1. **Wijzig code**
   - Edit: `supabase/functions/website-viewer/index.ts`

2. **Deploy opnieuw**
   ```bash
   supabase functions deploy website-viewer
   ```

---

## Troubleshooting

### "Bucket does not exist"
**Probleem:** Assets bucket niet aangemaakt
**Oplossing:**
1. Dashboard → Storage
2. Create bucket: `assets`
3. Public: ✅ Yes

### "Permission denied"
**Probleem:** Bucket is niet public
**Oplossing:**
1. Dashboard → Storage → assets
2. Settings → Public access: ON

### "CSS not loading"
**Probleem:** CORS or cache issue
**Oplossing:**
1. Hard refresh: Ctrl + Shift + R
2. Check Network tab for errors
3. Verify CSS URLs in browser

### "Old styling shows"
**Probleem:** Browser cache
**Oplossing:**
1. Hard refresh
2. Clear browser cache
3. Incognito mode test

---

## Checklist

- [ ] Assets bucket aangemaakt
- [ ] Bucket is public
- [ ] styles/ folder aangemaakt
- [ ] main.css geüpload
- [ ] components.css geüpload
- [ ] CSS URLs getest (200 OK)
- [ ] website-viewer edge function gedeployed
- [ ] Test URL werkt met styling
- [ ] Browser cache cleared
- [ ] Pagina's zien er mooi uit! 🎉

---

## Belangrijke URLs

**CSS Files:**
```
https://[project].supabase.co/storage/v1/object/public/assets/styles/main.css
https://[project].supabase.co/storage/v1/object/public/assets/styles/components.css
```

**Test URL:**
```
https://[project].supabase.co/functions/v1/website-viewer?brand_id=[uuid]
```

**Supabase Dashboard:**
```
https://supabase.com/dashboard/project/[project-id]
```

---

## Hulp Nodig?

1. Check edge function logs: `supabase functions logs website-viewer`
2. Check browser console (F12)
3. Verify CSS URLs direct in browser
4. Check deze instructies nogmaals door

**Veelvoorkomende Fouten:**
- ❌ 404 op CSS → Bucket niet public of files niet geüpload
- ❌ CORS errors → Edge function mist CORS headers (al toegevoegd)
- ❌ Geen styling → CSS URLs incorrect of browser cache
- ❌ Oude styling → Browser cache, doe hard refresh

---

## Success! 🎉

Als alles werkt zie je:
- ✅ Volledige styling op gepubliceerde pagina's
- ✅ Hero sections met overlays
- ✅ Mooi gestijlde media rows
- ✅ Professional Inter font
- ✅ Responsive design

Klaar om live te gaan!
