# External Builder & QuickStart Templates Integration

## Overview

Dit systeem maakt het mogelijk voor externe template builders (zoals AI Website Studio) om hun templates te registreren en beschikbaar te maken als QuickStart templates voor brands.

## Architectuur

### 1. External Builder Registration

Externe builders registreren zich door hun registration endpoint beschikbaar te maken:

```
GET https://www.ai-websitestudio.nl/api/templates/registration
```

Response bevat:
- Builder metadata (naam, URL, versie)
- Beschikbare template categories (Gowild, Tripex, etc.)
- API endpoints voor het ophalen van pagina's

### 2. Database Structuur

**external_builders**
- Opslag van geregistreerde externe builders
- API endpoints en authenticatie
- Actief/inactief status

**builder_categories**
- Template categories per builder
- Gowild Website (16 pagina's)
- Tripex Website (25 pagina's)
- Metadata en preview URLs

**quickstart_templates**
- Operator-geconfigureerde QuickStart templates
- Selectie van pagina's uit een category
- Bijvoorbeeld: "Gowild Starter" met 4 pagina's (index, about, contact, tours)

**websites**
- Nieuwe velden:
  - `template_source_type`: 'quickstart' | 'custom' | 'wordpress'
  - `quickstart_template_id`: Link naar gekozen QuickStart
  - `external_builder_id`: Link naar externe builder

## Operator Workflow

### Stap 1: Registreer External Builder

1. Ga naar **Operator Dashboard > External Builders**
2. Klik **"Register Builder"**
3. Vul in:
   - Registration URL: `https://www.ai-websitestudio.nl/api/templates/registration`
   - Auth Token: (optioneel)
4. Klik **"Register Builder"**

Het systeem:
- Haalt builder metadata op
- Slaat builder en categories op in database
- Maakt categories beschikbaar voor QuickStart configuratie

### Stap 2: Configureer QuickStart Templates

1. Ga naar **Operator Dashboard > QuickStart Templates**
2. Klik **"Create QuickStart"**
3. Selecteer:
   - Builder: "AI Website Studio"
   - Category: "Gowild Website" of "Tripex Website"
   - Display Name: bijv. "Gowild Starter"
   - Description: Korte uitleg
4. Selecteer pagina's (recommended pages worden voorgeselecteerd):
   - Voor Gowild: index, about, contact, tours
   - Voor Tripex: index, about, contact, tour-grid
5. Klik **"Create QuickStart"**

## Brand Workflow

### Website Aanmaken met QuickStart

1. Brand gaat naar **Dashboard > QuickStart Website**
2. Kiest een QuickStart template (bijv. "Gowild Starter")
3. Systeem:
   - Fetcht de geselecteerde pagina's via builder API
   - Maakt nieuwe website aan
   - Slaat pagina's op in database
   - Linkt website aan external_builder_id

### Extra Pagina's Toevoegen in Editor

1. Brand opent **Website Editor**
2. Ziet huidige pagina's (index, about, contact, tours)
3. Klikt **"+ Pagina toevoegen uit template"**
4. Modal toont:
   - Alle beschikbare pagina's uit Gowild (16 totaal)
   - Minus de al toegevoegde pagina's (4)
   - = 12 pagina's om uit te kiezen
5. Brand selecteert bijv. "services"
6. Systeem:
   - Fetcht "services" pagina via builder API
   - Voegt pagina toe aan website
7. Website heeft nu 5 pagina's

## API Flow

### Builder Registration

```typescript
POST /functions/v1/register-external-builder
Body: {
  registration_url: "https://www.ai-websitestudio.nl/api/templates/registration",
  auth_token: "optional-token"
}
```

### Lijst van Beschikbare Pagina's

```typescript
GET /functions/v1/fetch-external-page?builder_id={id}&category=gowild&action=list

Response: {
  pages: [
    { slug: "index", title: "Home", description: "..." },
    { slug: "about", title: "About Us", description: "..." },
    // ... 14 meer
  ]
}
```

### Specifieke Pagina Ophalen

```typescript
GET /functions/v1/fetch-external-page?builder_id={id}&category=gowild&page=services

Response: {
  slug: "services",
  title: "Services",
  html: "<!DOCTYPE html>...",
  css: "...",
  metadata: {...}
}
```

## External Builder API Requirements

Externe builders moeten de volgende endpoints aanbieden:

### 1. Registration Endpoint

```
GET /api/templates/registration

Response: {
  builder_name: "AI Website Studio",
  builder_url: "https://www.ai-websitestudio.nl",
  api_endpoint: "https://www.ai-websitestudio.nl/api/templates",
  editor_url: "https://www.ai-websitestudio.nl/simple-template-editor.html",
  version: "1.0.0",
  categories: [
    {
      category: "gowild",
      display_name: "Gowild Website",
      description: "Modern outdoor adventure template",
      total_pages: 16,
      preview_url: "https://.../preview.png",
      tags: ["adventure", "outdoor", "tours"],
      features: ["Hero slider", "Tour pages", ...],
      recommended_pages: ["index", "about", "contact", "tours"]
    }
  ]
}
```

### 2. List Pages Endpoint

```
GET /api/templates/{category}/list

Response: {
  pages: [
    {
      slug: "index",
      title: "Home",
      description: "Main homepage",
      preview_url: "https://.../previews/index.png"
    },
    ...
  ]
}
```

### 3. Get Page Endpoint

```
GET /api/templates/{category}/{page-slug}

Response: {
  slug: "services",
  title: "Services",
  html: "<!DOCTYPE html>...",
  css: "body { ... }",
  metadata: {
    description: "Services page",
    keywords: ["services", "offerings"]
  }
}
```

## Security & RLS

- **Operators**: Volledige toegang tot builders en QuickStart configuratie
- **Brands**: Kunnen alleen actieve QuickStart templates zien en gebruiken
- **Service Role**: Volledige toegang voor API operaties
- **Auth Tokens**: Optionele authenticatie voor builder API calls

## Voordelen

1. **Voor Operators**:
   - Eenvoudig nieuwe builders registreren
   - Flexibel QuickStart templates configureren
   - Geen HTML in database opslaan

2. **Voor Brands**:
   - Snelle website setup met QuickStart
   - Flexibel extra pagina's toevoegen
   - Professionele templates out-of-the-box

3. **Voor External Builders**:
   - Behouden controle over templates
   - Updates zijn direct beschikbaar
   - Eigen editor interface behouden

## Volgende Stappen

1. **Test de AI Website Studio registratie**:
   ```bash
   # Via Operator Dashboard
   Registration URL: https://www.ai-websitestudio.nl/api/templates/registration
   ```

2. **Configureer eerste QuickStart**:
   - Gowild Starter (4 pagina's)
   - Tripex Starter (4 pagina's)

3. **Test Brand Flow**:
   - Maak website met QuickStart
   - Voeg extra pagina's toe in editor

4. **Implementeer Editor Integratie**:
   - Modal voor "Pagina toevoegen uit template"
   - Preview van beschikbare pagina's
   - Fetch en toevoegen functionaliteit
