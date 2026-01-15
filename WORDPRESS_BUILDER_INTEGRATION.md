# WordPress HTML Editor Integration Specificatie

## Overzicht

De externe builder op `https://www.ai-websitestudio.nl/index.html` moet ondersteuning bieden voor het bewerken van WordPress template HTML.

## URL Parameters voor HTML Edit Modus

Wanneer een gebruiker op "Bewerken in Editor" klikt in de WordPress editor, wordt de builder geopend met deze parameters:

```
https://www.ai-websitestudio.nl/index.html?
  token=<JWT_TOKEN>&
  api=<SUPABASE_URL>&
  apikey=<SUPABASE_ANON_KEY>&
  mode=edit-html&
  html=<HTML_CONTENT>&
  page_name=<PAGE_NAME>&
  website_id=<WEBSITE_ID>&
  page_index=<PAGE_INDEX>&
  return_url=<RETURN_URL>
```

### Parameter Beschrijvingen

| Parameter | Verplicht | Beschrijving | Voorbeeld |
|-----------|-----------|--------------|-----------|
| `token` | Ja | JWT token voor authenticatie | `eyJhbGc...` |
| `api` | Ja | Supabase API URL | `https://xxx.supabase.co` |
| `apikey` | Ja | Supabase Anon Key | `eyJhbGc...` |
| `mode` | Ja | Modus (MOET "edit-html" zijn) | `edit-html` |
| `html` | Ja | De volledige HTML content van de pagina | `<!DOCTYPE html>...` |
| `page_name` | Ja | Naam van de pagina | `Home` |
| `website_id` | Ja | UUID van de website | `123e4567-e89b-12d3-a456-426614174000` |
| `page_index` | Ja | Index van de pagina in de pages array | `0` |
| `return_url` | Ja | URL om naar terug te keren na opslaan | `https://app.example.com/websites/...` |

## Wat de Builder Moet Doen

### 1. HTML Laden

```javascript
// Lees URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');

if (mode === 'edit-html') {
  const html = urlParams.get('html');
  const pageName = urlParams.get('page_name');
  const websiteId = urlParams.get('website_id');
  const pageIndex = urlParams.get('page_index');
  const returnUrl = urlParams.get('return_url');
  const token = urlParams.get('token');
  const api = urlParams.get('api');

  // Decodeer de HTML (is URL-encoded)
  const decodedHtml = decodeURIComponent(html);

  // Laad HTML in de editor
  loadHtmlInEditor(decodedHtml);

  // Toon pagina naam in de UI
  document.title = `Bewerken: ${pageName}`;
}
```

### 2. UI Aanpassingen

Toon een indicator dat de gebruiker een WordPress pagina aan het bewerken is:

```html
<div class="wordpress-mode-indicator">
  🌐 WordPress Modus
  <div class="page-info">
    <strong>{page_name}</strong>
    <span class="text-muted">Bewerken</span>
  </div>
</div>
```

### 3. HTML Opslaan

Wanneer de gebruiker op "Opslaan" klikt, stuur de bijgewerkte HTML terug:

```javascript
async function saveWordPressPage() {
  // Haal de bijgewerkte HTML op uit je editor
  const updatedHtml = getHtmlFromEditor();

  const token = urlParams.get('token');
  const api = urlParams.get('api');
  const websiteId = urlParams.get('website_id');
  const pageIndex = urlParams.get('page_index');
  const pageName = urlParams.get('page_name');

  try {
    const response = await fetch(`${api}/functions/v1/wordpress-update-page`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        website_id: websiteId,
        page_index: parseInt(pageIndex),
        html: updatedHtml,
        page_name: pageName
      })
    });

    const result = await response.json();

    if (result.success) {
      // Toon success melding
      alert('✅ Pagina opgeslagen!');

      // Optioneel: Redirect terug naar de WordPress editor
      const returnUrl = urlParams.get('return_url');
      if (returnUrl) {
        window.location.href = returnUrl;
      }
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error saving page:', error);
    alert('❌ Fout bij opslaan: ' + error.message);
  }
}
```

## API Endpoint Details

### POST `/functions/v1/wordpress-update-page`

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "page_index": 0,
  "html": "<!DOCTYPE html><html>...</html>",
  "page_name": "Home"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Page updated successfully",
  "page_index": 0
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Workflow Diagram

```
┌─────────────────┐
│ WordPress       │
│ Editor          │
│                 │
│ [Bewerken btn]  │ ──┐
└─────────────────┘   │
                      │ Opens in new tab with URL params
                      ↓
           ┌──────────────────────┐
           │ Externe Builder      │
           │                      │
           │ 1. Read URL params   │
           │ 2. Load HTML         │
           │ 3. User edits        │
           │ 4. Click "Opslaan"   │
           └──────────────────────┘
                      │
                      │ POST to wordpress-update-page
                      ↓
           ┌──────────────────────┐
           │ Edge Function        │
           │                      │
           │ Updates website.pages│
           │ in Supabase          │
           └──────────────────────┘
                      │
                      │ Returns success
                      ↓
           ┌──────────────────────┐
           │ Redirect to          │
           │ return_url           │
           └──────────────────────┘
```

## Belangrijke Opmerkingen

### HTML Encoding
- De HTML wordt URL-encoded doorgegeven in de URL parameter
- Gebruik `decodeURIComponent()` om de HTML te decoderen

### Authenticatie
- De JWT token wordt meegestuurd in de URL
- Deze token MOET worden gebruikt in de Authorization header bij API calls
- De token is tijdelijk geldig (meestal 1 uur)

### Error Handling
```javascript
// Voorbeeld error handling
try {
  const response = await fetch(...);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }

  // Success handling
} catch (error) {
  // Toon duidelijke foutmelding aan gebruiker
  console.error('Save error:', error);
  alert(`Fout bij opslaan: ${error.message}`);
}
```

### Return URL
- Na succesvol opslaan kan de gebruiker terug naar de WordPress editor
- Gebruik de `return_url` parameter
- Dit is optioneel - je kunt ook in de builder blijven

## Testing

### Test URL Voorbeeld

```
https://www.ai-websitestudio.nl/index.html?
  token=YOUR_JWT_TOKEN&
  api=https://huaaogdxxdcakxryecnw.supabase.co&
  apikey=YOUR_ANON_KEY&
  mode=edit-html&
  html=%3C%21DOCTYPE%20html%3E%3Chtml%3E%3Chead%3E%3C%2Fhead%3E%3Cbody%3E%3Ch1%3ETest%3C%2Fh1%3E%3C%2Fbody%3E%3C%2Fhtml%3E&
  page_name=Test%20Page&
  website_id=123e4567-e89b-12d3-a456-426614174000&
  page_index=0&
  return_url=https://www.ai-travelstudio.nl
```

### Test Checklist

- [ ] URL parameters worden correct gelezen
- [ ] HTML wordt correct gedecodeerd en geladen
- [ ] UI toont WordPress modus indicator
- [ ] Gebruiker kan HTML bewerken
- [ ] Opslaan button roept correct de edge function aan
- [ ] Success melding wordt getoond
- [ ] Bij success: redirect naar return_url werkt
- [ ] Bij error: duidelijke foutmelding wordt getoond
- [ ] JWT token wordt correct meegestuurd in Authorization header

## Implementatie Checklist voor Builder Developer

```javascript
// 1. Check if we're in edit-html mode
function checkWordPressModus() {
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode === 'edit-html';
}

// 2. Load WordPress page if in edit mode
if (checkWordPressModus()) {
  initWordPressEditMode();
}

function initWordPressEditMode() {
  const params = new URLSearchParams(window.location.search);

  // Extract all parameters
  const data = {
    html: decodeURIComponent(params.get('html') || ''),
    pageName: params.get('page_name'),
    websiteId: params.get('website_id'),
    pageIndex: parseInt(params.get('page_index') || '0'),
    returnUrl: params.get('return_url'),
    token: params.get('token'),
    api: params.get('api')
  };

  // Store for later use
  window.wordPressEditData = data;

  // Load HTML into editor
  loadHtmlInEditor(data.html);

  // Update UI
  showWordPressModeIndicator(data.pageName);

  // Replace save button handler
  replaceDefaultSaveWithWordPressSave();
}

function replaceDefaultSaveWithWordPressSave() {
  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.onclick = saveWordPressPage;
  }
}

async function saveWordPressPage() {
  const data = window.wordPressEditData;
  const updatedHtml = getHtmlFromEditor();

  // Show loading state
  showLoadingState('Opslaan...');

  try {
    const response = await fetch(`${data.api}/functions/v1/wordpress-update-page`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        website_id: data.websiteId,
        page_index: data.pageIndex,
        html: updatedHtml,
        page_name: data.pageName
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    // Success!
    showSuccessMessage('Pagina opgeslagen!');

    // Optional: Return to WordPress editor
    if (data.returnUrl) {
      setTimeout(() => {
        window.location.href = data.returnUrl;
      }, 1000);
    }
  } catch (error) {
    console.error('Error saving:', error);
    showErrorMessage('Fout bij opslaan: ' + error.message);
  } finally {
    hideLoadingState();
  }
}
```

## Vragen?

Als er onduidelijkheden zijn over de implementatie, neem dan contact op!
