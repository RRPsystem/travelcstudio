# TravelCStudio - Functionele Test Checklist

## Na elke wijziging deze functies testen:

### 🤖 AI Generatie
- [ ] **Bestemmingen AI**: Admin → Content → Bestemmingen → Nieuw → "Genereer met AI" → Velden worden gevuld
- [ ] **Route AI**: Website-builder → Travel → Route genereren → Tekst wordt gegenereerd
- [ ] **WhatsApp Bot**: Stuur bericht → Krijg antwoord → Vraag routekaart → Kaart wordt getoond

### 📰 WordPress Nieuws
- [ ] **Nieuws sync**: TravelCStudio nieuws → WordPress sync → Content zonder CSS/HTML rommel
- [ ] **Elementor template**: Nieuws post openen → Juiste template wordt getoond

### 🌍 Bestemmingen
- [ ] **Nieuwe bestemming opslaan**: Admin → Content → Bestemmingen → Nieuw → Opslaan → Geen error
- [ ] **Bestemming bewerken**: Bestaande bestemming → Wijzigen → Opslaan → Wijzigingen behouden
- [ ] **Bestemming bekijken**: Frontend → Bestemming pagina laadt correct

### ✈️ TravelBro / Roadbook
- [ ] **Roadbook aanmaken**: Website-builder → Travel → Roadbook maken → Opent correct
- [ ] **Client pagina**: travelbro.nl/[token] → Pagina laadt met reis data
- [ ] **WhatsApp integratie**: Chat werkt, context blijft behouden

### 🔐 Authenticatie
- [ ] **Admin login**: admin.travelcstudio.com → Inloggen werkt
- [ ] **Brand login**: Brand dashboard toegankelijk
- [ ] **Sessie behoud**: Na refresh nog ingelogd

---

## Bekende Gevoelige Gebieden
Deze onderdelen breken vaak bij wijzigingen elders:

1. **Edge Functions** - Wijzigingen aan `generate-content` kunnen AI generatie breken
2. **Supabase queries** - Database schema wijzigingen kunnen queries breken
3. **WordPress plugin** - Versie updates moeten altijd getest worden
4. **WhatsApp webhook** - Afhankelijk van meerdere services

---

## Hoe te gebruiken
1. Voor je een PR merged of deploy doet, loop deze checklist door
2. Markeer items als ✅ getest of ❌ broken
3. Fix broken items VOOR je verder gaat met nieuwe features

Laatst bijgewerkt: 2026-02-05
