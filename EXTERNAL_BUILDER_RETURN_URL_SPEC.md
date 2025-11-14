# Externe Builder - Return URL Implementatie Specificatie

## Overzicht
De deeplinks naar de externe builder (ai-websitestudio.nl) bevatten nu een `return_url` parameter. Na het opslaan van een pagina, menu of footer moet de builder automatisch terugnavigeren naar deze URL.

## Wat is er veranderd in de deeplinks?

### Voorbeeld deeplink MET return_url:
```
https://www.ai-websitestudio.nl/?api=https://...supabase.co/functions/v1&brand_id=123&token=eyJ...&return_url=https://jouw-app.com/%23/brand/website/pages#/mode/page
```

### Parameters:
- `api` - API base URL (ongewijzigd)
- `brand_id` - Brand ID (ongewijzigd)
- `token` - JWT token (ongewijzigd)
- `apikey` - API key (ongewijzigd)
- `page_id` - Pagina ID indien van toepassing (ongewijzigd)
- `menu_id` - Menu ID indien van toepassing (ongewijzigd)
- `footer_id` - Footer ID indien van toepassing (ongewijzigd)
- **`return_url`** - **NIEUW**: URL waarnaar de builder moet redirecten na opslaan

## Te implementeren functionaliteit

### 1. Return URL uitlezen bij opstarten
Wanneer de builder wordt geopend via een deeplink, moet de `return_url` parameter worden uitgelezen:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const returnUrl = urlParams.get('return_url');

// Bewaar deze in je state/store voor later gebruik
if (returnUrl) {
  // Opslaan in localStorage of state management
  localStorage.setItem('builder_return_url', returnUrl);
}
```

### 2. Redirect na succesvol opslaan
Na het succesvol opslaan van een pagina/menu/footer:

```javascript
// Na succesvolle save operatie
const handleSaveSuccess = () => {
  // Haal de return URL op
  const returnUrl = localStorage.getItem('builder_return_url');

  if (returnUrl) {
    // Wis de return URL uit localStorage
    localStorage.removeItem('builder_return_url');

    // Redirect naar de return URL
    window.location.href = returnUrl;
  } else {
    // Fallback: blijf op huidige pagina of toon succes melding
    console.log('Succesvol opgeslagen, geen return URL opgegeven');
  }
};
```

### 3. Gebruikersinterface (optioneel maar aanbevolen)
Toon een knop of notificatie na het opslaan:

```javascript
// Optie A: Directe redirect (aanbevolen voor goede UX)
handleSaveSuccess(); // Direct redirecten

// Optie B: Toon eerst een succes melding met knop
showSuccessMessage({
  message: 'Wijzigingen succesvol opgeslagen!',
  buttons: [
    {
      text: 'Terug naar dashboard',
      onClick: () => window.location.href = returnUrl
    },
    {
      text: 'Blijf bewerken',
      onClick: () => hideSuccessMessage()
    }
  ]
});
```

## Return URL per context

De return URL verschilt per context waar de builder wordt geopend:

| Context | Return URL |
|---------|------------|
| Pagina beheer | `https://app.com/#/brand/website/pages` |
| Menu beheer | `https://app.com/#/brand/website/menu` |
| Footer beheer | `https://app.com/#/brand/website/footer` |
| Nieuwsbeheer | `https://app.com/#/brand/content/news` |

## Edge cases en foutafhandeling

### 1. Geen return_url parameter
Als er geen `return_url` is meegegeven, blijf dan gewoon in de builder zoals normaal.

```javascript
if (!returnUrl) {
  // Blijf in de builder, toon normale succes melding
  showNotification('Succesvol opgeslagen!');
  return;
}
```

### 2. Ongeldige return_url
Valideer de return URL voordat je redirected:

```javascript
const isValidReturnUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    // Optioneel: check of het domein vertrouwd is
    const allowedDomains = ['jouw-app.com', 'localhost'];
    return allowedDomains.some(domain => parsedUrl.hostname.includes(domain));
  } catch {
    return false;
  }
};

if (returnUrl && isValidReturnUrl(returnUrl)) {
  window.location.href = returnUrl;
} else {
  console.warn('Ongeldige return URL:', returnUrl);
}
```

### 3. Save mislukt
Bij een mislukte save operatie, redirect NIET:

```javascript
const handleSaveError = (error) => {
  // Toon error
  showErrorMessage('Opslaan mislukt: ' + error.message);

  // Blijf in de builder, redirect NIET
  // De return_url blijft bewaard in localStorage voor volgende poging
};
```

## Implementatie checklist

- [ ] Return URL parameter uitlezen bij opstarten builder
- [ ] Return URL opslaan in localStorage of state
- [ ] Na succesvol opslaan van pagina: redirect naar return URL
- [ ] Na succesvol opslaan van menu: redirect naar return URL
- [ ] Na succesvol opslaan van footer: redirect naar return URL
- [ ] Return URL validatie implementeren
- [ ] Return URL cleanup na redirect
- [ ] Foutafhandeling: geen redirect bij mislukte save
- [ ] Fallback gedrag als geen return URL aanwezig is
- [ ] Testen met echte deeplinks

## Vragen?

Als er vragen zijn over deze implementatie, neem dan contact op met de ontwikkelaar van de hoofdapplicatie.

## Test URLs

Voor testdoeleinden kun je deze URLs gebruiken:

### Nieuwe pagina maken:
```
https://www.ai-websitestudio.nl/?api=...&brand_id=...&token=...&return_url=http://localhost:5173/%23/brand/website/pages#/mode/page
```

### Bestaande pagina bewerken:
```
https://www.ai-websitestudio.nl/?api=...&brand_id=...&token=...&page_id=123&return_url=http://localhost:5173/%23/brand/website/pages#/mode/page
```

### Menu bewerken:
```
https://www.ai-websitestudio.nl/?api=...&brand_id=...&token=...&menu_id=456&return_url=http://localhost:5173/%23/brand/website/menu#/mode/menu
```

### Nieuw nieuwsbericht maken:
```
https://www.ai-websitestudio.nl/?api=...&brand_id=...&token=...&content_type=news_items&return_url=http://localhost:5173/%23/brand/content/news#/mode/news
```

### Bestaand nieuwsbericht bewerken:
```
https://www.ai-websitestudio.nl/?api=...&brand_id=...&token=...&content_type=news_items&news_slug=my-article&return_url=http://localhost:5173/%23/brand/content/news#/mode/news
```

**Let op**: De `#` in de return URL wordt URL-encoded als `%23`.
