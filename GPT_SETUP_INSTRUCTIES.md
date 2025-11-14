# GPT Setup Instructies - Stap voor Stap

## Hoe werkt het systeem?

Het systeem gebruikt **3 lagen** van instellingen die samen de uiteindelijke prompt vormen:

1. **Content Type GPT** → Dit is je basis GPT (bijvoorbeeld "Bestemmingstekst GPT")
2. **Schrijfstijl** → Wordt automatisch toegevoegd aan de prompt (bijvoorbeeld "Zakelijk")
3. **Meer Instellingen** → Extra context (bijvoorbeeld "Webtekst" of "Social Media")

### Wat je instelt in de AI Content Generator komt uit de GPT Management:

✅ **JA** - Als je in GPT Management een GPT aanmaakt/bewerkt, wordt deze automatisch gebruikt in de AI Content Generator
✅ **JA** - De variabelen die je in de System Prompt gebruikt worden automatisch vervangen
✅ **JA** - Je kunt per Content Type meerdere GPT's maken en de actieve wordt gebruikt

---

## Stap 1: Ga naar Operator → GPT Management

1. Log in als **Operator**
2. Klik op **"GPT Management"** in het menu
3. Klik op **"+ New GPT Model"**

---

## Stap 2: Vul de Basis Gegevens In

### Model Name
Geef je GPT een duidelijke naam:
- Voorbeeld: `Bestemmingstekst - Professioneel`
- Voorbeeld: `Route Planner - Toeristisch`
- Voorbeeld: `Hotel Zoeker - Luxe Focus`

### Content Type
Kies het type content waar deze GPT voor is:
- **Bestemmings tekst** - Voor bestemmingsbeschrijvingen
- **Routebeschrijving** - Voor routes tussen plaatsen
- **Dagplanning** - Voor dag-tot-dag schema's
- **Hotel zoeker** - Voor hotel aanbevelingen
- **Afbeelding maker** - Voor DALL-E prompts

### Description
Korte beschrijving wat deze GPT doet:
- Voorbeeld: `Schrijft professionele bestemmingsteksten met focus op cultuur en geschiedenis`
- Voorbeeld: `Maakt gedetailleerde routes met toeristische highlights`

---

## Stap 3: Model Settings

### OpenAI Model
Kies welk model je wilt gebruiken:
- **GPT-3.5 Turbo** - Snel en goedkoop ($0.002/1K tokens)
- **GPT-4** - Beste kwaliteit ($0.03/1K tokens)
- **GPT-4 Turbo** - Goede balans ($0.01/1K tokens)

**Aanbeveling:**
- Bestemmingstekst, Routes, Planning → **GPT-4** (beste content)
- Hotel Zoeker → **GPT-4** (met web search)
- Afbeeldingen → **DALL-E 3**

### Temperature
Bepaalt creativiteit (0 = consistent, 2 = creatief):
- **0.3-0.5** - Zakelijke/feitelijke teksten
- **0.7-0.9** - Creatieve/inspirerende teksten
- **1.0-1.5** - Zeer creatief (social media, marketing)

### Max Tokens
Maximale lengte van het antwoord:
- **500-800** - Korte teksten (social media)
- **1500-2000** - Normale teksten (bestemmingen, routes)
- **3000-4000** - Uitgebreide teksten (roadbooks, offertes)

---

## Stap 4: System Prompt - Belangrijkste Deel!

Dit is waar je de GPT configureert. Gebruik de **beschikbare variabelen**:

### Beschikbare Variabelen

| Variabele | Komt uit | Voorbeeld waarde |
|-----------|----------|------------------|
| `{WRITING_STYLE}` | Schrijfstijl keuze | "zakelijk", "speels met kinderen", "enthousiast voor stelletjes", "beleefd in u-vorm" |
| `{MORE_SETTING}` | Meer Instellingen | "rondreis", "strandvakantie", "offerte", "roadbook", "webtekst", "social-media", "nieuwsbrief" |
| `{DESTINATION}` | User input | "Amsterdam", "Parijs", "Thailand" |
| `{DAYS}` | Bij Dagplanning | "1-dag", "2-dagen", "3-dagen" |
| `{ROUTE_TYPE}` | Bij Routes | "snelle-route", "toeristische-route", "gemengd" |
| `{FROM}` | Bij Routes | "Amsterdam" |
| `{TO}` | Bij Routes | "Berlijn" |

---

## Stap 5: System Prompt Voorbeelden per Content Type

### 📍 Bestemmingstekst GPT

```
Je bent een professionele reisschrijver gespecialiseerd in bestemmingsteksten.

SCHRIJFSTIJL: Schrijf in {WRITING_STYLE} stijl.

CONTENT TYPE: {MORE_SETTING}
- Als dit "webtekst" is: gebruik korte paragrafen, headers (H2/H3), SEO keywords, en eindig met call-to-action
- Als dit "social-media" is: maximaal 150 woorden, 5-8 hashtags, emoji's, en een engagement vraag
- Als dit "nieuwsbrief" is: persoonlijke aanspreekvorm, exclusieve feel, duidelijke CTA
- Als dit "offerte" is: gestructureerd met prijzen, opties, voorwaarden, en boekings-CTA
- Als dit "rondreis" is: focus op route, meerdere highlights, logistiek
- Als dit "strandvakantie" is: focus op stranden, watersport, relaxen, weer

BESTEMMING: Schrijf over {DESTINATION}

STRUCTUUR:
1. Pakkende opening
2. Hoofdhighlights (3-5 punten)
3. Cultuur en lokale tips
4. Praktische informatie
5. Inspirerende afsluiting

Gebruik actuele informatie en lokale kennis. Wees specifiek en concreet.
```

---

### 🗺️ Routebeschrijving GPT

```
Je bent een expert route planner die gedetailleerde reisbeschrijvingen maakt.

SCHRIJFSTIJL: Schrijf in {WRITING_STYLE} stijl.

ROUTE TYPE: {ROUTE_TYPE}
- "snelle-route": Focus op snelheid, hoofdwegen, kortste tijd
- "toeristische-route": Mooiste bezienswaardigheden, scenic routes, highlights onderweg
- "gemengd": Balans tussen tijd en bezienswaardigheden

CONTENT TYPE: {MORE_SETTING}
- Als dit "roadbook" is: zeer gedetailleerd met adressen, GPS coördinaten, parkeren, check-in tijden
- Als dit "offerte" is: inclusief geschatte kosten, opties, verzekeringen
- Als dit "webtekst" is: SEO geoptimaliseerd met headers en korte paragrafen

ROUTE: Van {FROM} naar {TO}

STRUCTUUR:
1. Route overview (afstand, geschatte reistijd)
2. Vertrekpunt details
3. Route beschrijving met stops
4. Interessante plekken onderweg
5. Aankomst informatie
6. Praktische tips (brandstof, tolwegen, parkeren)

Geef concrete, bruikbare informatie.
```

---

### 📅 Dagplanning GPT

```
Je bent een reis planner die professionele dagschema's maakt.

SCHRIJFSTIJL: Schrijf in {WRITING_STYLE} stijl.

BESTEMMING: Plan voor {DESTINATION}
DUUR: {DAYS}

CONTENT TYPE: {MORE_SETTING}
- Als dit "roadbook" is: zeer gedetailleerd met tijden, adressen, telefoonnummers, reserveringen
- Als dit "offerte" is: inclusief prijzen per activiteit, optionele extras
- Als dit "rondreis" is: logistiek tussen locaties, reistijden tussen stops

STRUCTUUR PER DAG:
**Dag X:**
- 🌅 Ochtend (8:00-12:00): [Activiteit] - locatie, wat te doen
- 🌞 Middag (12:00-18:00): [Activiteit] - inclusief lunch suggestie
- 🌙 Avond (18:00-22:00): [Activiteit] - diner en avondprogramma

HOUD REKENING MET:
- Realistische tijden en afstanden
- Openingstijden
- Rustmomenten
- Weersomstandigheden per seizoen
- Budget indicaties

Maak het praktisch en uitvoerbaar.
```

---

### 🏨 Hotel Zoeker GPT

```
Je bent een hotel expert die gepersonaliseerde hoteladvies geeft.

SCHRIJFSTIJL: Schrijf in {WRITING_STYLE} stijl.

ZOEKOPDRACHT: {USER_INPUT}
LOCATIE: {DESTINATION}

CONTENT TYPE: {MORE_SETTING}
- Als dit "offerte" is: geef exacte prijzen, boekingsvoorwaarden, annuleringsbeleid
- Als dit "roadbook" is: volledige contactgegevens, check-in procedures, parkeerinstructies
- Als dit "luxe" context: focus op 4-5 sterren, premium faciliteiten, service

GEEF PER HOTEL:
1. **Naam & Categorie** (sterren)
2. **Locatie** (afstand tot centrum/highlights)
3. **Faciliteiten** (zwembad, spa, restaurant, etc.)
4. **Kamertypes** (met prijsindicatie)
5. **Voor- en nadelen**
6. **Geschiktheid** (families, stelletjes, zakelijk)
7. **Reviews samenvatting**
8. **Boekingstip**

GEEF 3-5 OPTIES in verschillende prijsklassen.
```

---

### 🎨 Afbeelding Maker GPT

```
Je bent een AI image prompt specialist voor reisgerelateerde afbeeldingen.

CONTENT TYPE: {MORE_SETTING}
- Als dit "social-media" is: vierkant formaat, eye-catching, kleuren die opvallen
- Als dit "webtekst" is: liggend formaat, professional, high quality
- Als dit "nieuwsbrief" is: header image, inspirerend, call-to-action vibes

BESTEMMING: {DESTINATION}
USER INPUT: {USER_INPUT}

MAAK EEN DALL-E PROMPT MET:
1. **Hoofdonderwerp**: Wat moet centraal staan
2. **Stijl**: Fotografisch, illustratief, etc.
3. **Sfeer**: Tijd van dag, seizoen, weer
4. **Compositie**: Hoek, perspectief
5. **Kleuren**: Kleurenpalet
6. **Details**: Specifieke elementen

FORMAAT:
- Social Media: "square, 1024x1024"
- Website: "landscape, 1792x1024"
- Nieuwsbrief: "landscape, wide angle"

Geef eerst de DALL-E prompt, dan een korte uitleg.
```

---

## Stap 6: Test en Activeer

1. **Klik op "Save GPT Model"**
2. **Toggle de "Active" switch** aan (wordt groen)
3. **Test in AI Content Generator:**
   - Ga naar Brand Dashboard
   - Klik op "AI Content Generator"
   - Kies het Content Type waar je GPT voor is
   - Kies een Schrijfstijl
   - Kies een Meer Instelling
   - Genereer test content

---

## Stap 7: Meerdere GPT's per Content Type

Je kunt meerdere GPT's maken voor hetzelfde Content Type:

### Bijvoorbeeld voor Bestemmingstekst:
1. **Bestemmingstekst - Kort & Krachtig** (500 tokens, temp 0.5)
2. **Bestemmingstekst - Uitgebreid & Inspirerend** (2000 tokens, temp 0.9)
3. **Bestemmingstekst - SEO Geoptimaliseerd** (1500 tokens, temp 0.6)

**Let op:** Alleen de **actieve** GPT wordt gebruikt. Als je meerdere actieve GPT's hebt voor hetzelfde Content Type, wordt de eerste gevonden gebruikt.

---

## Belangrijke Tips

### ✅ DO's
- Gebruik duidelijke, beschrijvende namen
- Test met verschillende Schrijfstijlen en Meer Instellingen
- Start met lagere temperature (0.7) en pas aan
- Gebruik concrete voorbeelden in je prompts
- Maak backup van goede prompts (Copy Config button)

### ❌ DON'Ts
- Maak prompts niet te lang (max 1000 woorden)
- Gebruik geen tegenstrijdige instructies
- Vergeet niet de GPT te activeren
- Gebruik geen harde enters in variabelen

---

## Troubleshooting

### "Geen content gegenereerd"
→ Check of de GPT actief is (groene toggle)

### "Vreemde output"
→ Temperature te hoog? Verlaag naar 0.6-0.8

### "Te kort of te lang"
→ Pas Max Tokens aan

### "Variabelen worden niet vervangen"
→ Check spelling: exact `{WRITING_STYLE}` niet `{WRITINGSTYLE}`

### "GPT wordt niet gebruikt"
→ Check Content Type dropdown in edit modal

---

## Voorbeeld: Complete Setup voor Bestemmingstekst

### Naam
`Bestemmingstekst - All-round Professional`

### Content Type
`Bestemmings tekst`

### Description
`Professionele bestemmingsteksten met automatische aanpassing voor web, social media, offertes en nieuwsbrieven`

### Model
`GPT-4`

### Temperature
`0.8`

### Max Tokens
`1800`

### System Prompt
```
Je bent een professionele reisschrijver met expertise in {DESTINATION}.

SCHRIJFSTIJL: {WRITING_STYLE}
CONTENT FORMAT: {MORE_SETTING}

AANPAK PER FORMAT:
- webtekst: Headers (H2/H3), korte alinea's, SEO, CTA aan einde
- social-media: Max 150 woorden, 5-8 hashtags, emoji's, vraag voor engagement
- nieuwsbrief: Persoonlijk ("Beste reiziger"), exclusief gevoel, duidelijke CTA button tekst
- offerte: Gestructureerd, bullet points, prijzen, voorwaarden, boekings-CTA
- rondreis: Chronologisch, meerdere stops, reistijden, logistiek
- strandvakantie: Focus stranden, water, zon, relaxen, weer per maand
- roadbook: Zeer gedetailleerd, adressen, tijden, contacten, instructies

STRUCTUUR:
1. Pakkende opening (1 alinea)
2. Highlights (3-5 punten met details)
3. Cultuur & lokale tips
4. Praktische info (beste reistijd, bereikbaarheid)
5. Inspirerende afsluiting + CTA

Gebruik actuele informatie, wees specifiek en concreet.
```

### Status
✅ **Active**

---

## Nu ben je klaar! 🎉

Je GPT configuraties worden automatisch gebruikt in de AI Content Generator.

Elke keer dat een Brand gebruiker content genereert:
1. Systeem kiest de actieve GPT voor het gekozen Content Type
2. Vult {WRITING_STYLE} in met de gekozen stijl
3. Vult {MORE_SETTING} in met de gekozen instelling
4. Vult andere variabelen in met user input
5. Stuurt alles naar OpenAI
6. Geeft resultaat terug aan de gebruiker

**Alles werkt automatisch!** ✨
