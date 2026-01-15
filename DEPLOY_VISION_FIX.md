# TravelBro Vision Fix - Deployment Instructies

## Status
✅ **Code is lokaal klaar** in `/supabase/functions/travelbro-chat/vision-tool.ts`
❌ **Moet nog gedeployed worden** naar Supabase

## Wat is gefixed?

De vision tool herkent nu expliciet vragen over **locatie identificatie**:

### Nieuwe triggers toegevoegd:
- "waar is dit"
- "waar ben ik"
- "welke plek"
- "welke plaats"
- "welke locatie"
- "kun je zien"
- "kun je de foto"
- "herkennen"

### Vision prompt verbeterd:
De prompt instrueert GPT-4o Vision nu specifiek om:
1. Locaties en landmarks te identificeren
2. De plaats/stad te vermelden als herkenbaar
3. Interessante details over de locatie te geven
4. Als onzeker: gewoon te beschrijven wat zichtbaar is

## Deployment Opties

### Optie 1: Via Supabase CLI (Aanbevolen - Snelst)

```bash
# 1. Login bij Supabase
npx supabase login

# 2. Deploy de functie
cd /tmp/cc-agent/57777034/project
npx supabase functions deploy travelbro-chat --no-verify-jwt --project-ref huaaogdxxdcakxryecnw
```

### Optie 2: Via Supabase Dashboard

1. Ga naar https://supabase.com/dashboard/project/huaaogdxxdcakxryecnw
2. Klik op "Edge Functions" in het linkermenu
3. Klik op "travelbro-chat"
4. Klik op "vision-tool.ts"
5. Vervang de code met de nieuwe versie (zie hieronder)
6. Klik op "Deploy"

### Optie 3: Via Management API

```bash
# Gebruik je Supabase access token
export SUPABASE_ACCESS_TOKEN="your-token-here"
cd /tmp/cc-agent/57777034/project
./deploy-travelbro-vision.sh
```

## Bestand locatie

De gefixte code staat in:
```
/tmp/cc-agent/57777034/project/supabase/functions/travelbro-chat/vision-tool.ts
```

## Testen na deployment

Test met deze vragen + een foto:
- "kun je nu zien waar dit is?"
- "waar is deze foto?"
- "welke plek is dit?"
- "herken je deze locatie?"

## Verwacht gedrag

**VOOR de fix:**
```
User: "kun je zien waar dit is?" + [foto]
Bot: "Ik kan geen foto's zien..."
```

**NA de fix:**
```
User: "kun je zien waar dit is?" + [foto]
Bot: "Dit is [locatie beschrijving], te vinden in [plaats]..."
```

---

**Hulp nodig?** Volg Optie 1 of 2 hierboven.
