# 🎙️ TravelAgent Voice - Action Plan

## Status: Beslissingen ✅ → Ready to Build 🚀

**Huidige situatie:** Alleen documentatie, geen code
**Doel:** Werkende voice-to-offer systeem voor travel agents
**Tijdlijn:** 12 weken (3 maanden)
**Budget:** €66.150 (eerste 3 maanden)
**Platform:** Web-based (mobile + desktop)
**Voice:** OpenAI Realtime API (beste kwaliteit)
**Offers:** Externe builder (zoals bij bv Reizen)

---

## ✅ Kritieke Beslissingen - GEMAAKT!

### ✅ Beslissing 1: Externe Builder - JA!

**GEKOZEN: Externe builder (zoals bij bv Reizen)**
- ✅ Sneller time-to-market (specialist doet zijn ding)
- ✅ Betere kwaliteit offer pages (hun expertise)
- ✅ Minder technische schuld voor ons
- ✅ **Bewezen: werkt al voor bv Reizen**
- ❌ Kosten per offer (€2-3)

**ACTIE:** ✅ Besloten - we gebruiken bestaande externe builder

---

### ✅ Beslissing 2: Multi-Platform - Mobile + Desktop!

**GEKOZEN: Web-based (werkt overal)**
- ✅ **Mobile:** Responsive web app (werkt op iOS + Android)
- ✅ **Desktop:** Werkt ook op laptop/desktop in browser
- ✅ Geen app store goedkeuring nodig
- ✅ Instant updates (push nieuwe versie, iedereen heeft het)
- ✅ 1x bouwen, overal werken
- ✅ Ook op tablet bruikbaar

**Technologie:**
- React web app (wat we al gebruiken)
- Web Speech API + OpenAI Realtime
- Progressive Web App features (installeerbaar)
- Push notifications via web push (opt-in)

**Voordelen beide platforms:**
```
MOBILE (onderweg):
- Agent bij klant thuis → voice op telefoon
- Snel offer maken in auto
- Notificaties op mobiel

DESKTOP (op kantoor):
- Agent op kantoor → voice op laptop
- Groot scherm voor offer review
- Multi-tasking makkelijker
```

**ACTIE:** ✅ Besloten - web-based, werkt op alles

---

### ✅ Beslissing 3: Voice Engine - OpenAI Realtime API!

**GEKOZEN: OpenAI Realtime API (beste kwaliteit)**
- ✅ State-of-the-art kwaliteit
- ✅ Natuurlijke conversaties
- ✅ Multi-turn dialogen
- ✅ Laagste latency (<1 sec)
- ✅ Nederlandse taal support
- ⚠️ Kosten: $0.06/min audio (~€0.06/min)

**Kosten calculatie:**
- 100 agents × 10 offers/dag × 3 min gesprek = 3.000 min/dag
- 3.000 × €0.06 = **€180/dag** = €5.400/maand
- Per offer: €0.18 (acceptabel vs €2.50 voor template)

**ACTIE:** ✅ Besloten - OpenAI Realtime API, geen compromissen

---

## 📋 Implementatie Plan

### FASE 0: Foundations (Week 1-2)

**Beslissingen finaliseren:**
- [ ] Externe builder ja/nee
- [ ] Mobile platform keuze
- [ ] Voice engine keuze
- [ ] Pricing model bepalen (voor agents)
- [ ] Beta testers identificeren (5 agencies)

**Database ontwerp:**
- [ ] `voice_conversations` tabel (opslaan voice sessies)
- [ ] `voice_offers` tabel (gegenereerde offers)
- [ ] `voice_agents` tabel (travel agents met voice toegang)
- [ ] `offer_generation_jobs` tabel (job queue)
- [ ] `offer_templates` tabel (template configuratie)

**Infrastructuur:**
- [ ] Supabase Edge Functions voor voice processing
- [ ] Audio storage bucket (voor opnames)
- [ ] Webhook endpoints opzetten
- [ ] Rate limiting configureren

---

### FASE 1: Voice Interface (Week 3-6)

**Als je INTERN bouwt:**

#### 1.1 Speech-to-Text Integration
- [ ] OpenAI Whisper API integratie
- [ ] Audio upload naar Supabase Storage
- [ ] Transcriptie processing
- [ ] Error handling (ruis, accent, etc.)

#### 1.2 Conversation Management
- [ ] Intent detection (wat wil de agent?)
- [ ] Entity extraction (bestemming, datum, budget, etc.)
- [ ] Context tracking (multi-turn conversation)
- [ ] Clarifying questions generator

#### 1.3 Text-to-Speech
- [ ] OpenAI TTS of Google Cloud TTS
- [ ] Voice selection (Nederlands accent)
- [ ] Audio streaming
- [ ] Caching van veelgebruikte zinnen

#### 1.4 Conversation AI
```
Agent zegt: "Las Vegas, 15-22 juni, 2 volwassenen, 4-ster hotel met casino"

Systeem moet:
1. Herkennen: destinatie, datums, travelers, voorkeuren
2. Checken: wat ontbreekt? (vertrekpunt, budget, template)
3. Vragen: "Vanaf welk vliegveld vertrekken jullie?"
4. Onthouden: alle eerder gegeven info
5. Bevestigen: "Oké, dus Las Vegas vanaf Amsterdam, 15-22 juni..."
```

**Edge Functions te bouwen:**
- [ ] `voice-intake/index.ts` - Audio ontvangen
- [ ] `voice-transcribe/index.ts` - STT
- [ ] `voice-process/index.ts` - Intent + entities
- [ ] `voice-respond/index.ts` - Generate response + TTS
- [ ] `voice-session/index.ts` - Session management

---

### FASE 2: Offer Generation (Week 6-8)

**Als je externe builder HEBT:**

#### 2.1 API Integration
- [ ] Implementeer POST /v1/offers/create endpoint call
- [ ] Webhook ontvangst systeem
- [ ] Status polling (optioneel)
- [ ] Error handling + retry logic
- [ ] Timeout handling (als offer te lang duurt)

**Edge Functions:**
- [ ] `create-external-offer/index.ts` - Call externe API
- [ ] `offer-webhook-handler/index.ts` - Ontvang completion
- [ ] `offer-status-checker/index.ts` - Poll status

---

**Als je INTERN bouwt (veel meer werk!):**

#### 2.2 Hotel Search
- [ ] Booking.com API integratie (of alternatief)
- [ ] Prijs vergelijking
- [ ] Beschikbaarheid check
- [ ] Image scraping/API
- [ ] Reviews aggregatie

#### 2.3 Flight Search
- [ ] Amadeus API of Skyscanner API
- [ ] Multi-city search
- [ ] Price comparison
- [ ] Availability check

#### 2.4 Content Enrichment
- [ ] YouTube API voor destination videos
- [ ] Google Places voor hotel details
- [ ] Trip Advisor voor reviews
- [ ] Stock photos voor destinations

#### 2.5 Template Engine
- [ ] HTML/CSS templates (3 stijlen)
- [ ] Dynamic data injection
- [ ] Responsive design
- [ ] PDF generation (optioneel)

**Edge Functions:**
- [ ] `search-hotels/index.ts`
- [ ] `search-flights/index.ts`
- [ ] `generate-offer-page/index.ts`
- [ ] `render-template/index.ts`

---

### FASE 3: Mobile App (Week 8-10)

**UI Components:**
- [ ] Voice recording button (hold-to-talk)
- [ ] Waveform visualisatie tijdens opname
- [ ] Live transcript weergave
- [ ] AI response display (tekst + audio)
- [ ] Offer preview card
- [ ] Share functionaliteit

**Flows:**
```
1. Login → Voice Dashboard
2. Tap "New Offer" → Voice Recording
3. Speak → See transcript → AI responds
4. Conversation completes → "Generating offer..."
5. Push notification → "Offer ready!"
6. View offer → Share with client (WhatsApp)
```

**Features:**
- [ ] Background recording (als app niet in focus)
- [ ] Offline queueing (save audio, upload later)
- [ ] History (previous offers)
- [ ] Templates selectie (A/B/C)
- [ ] Client contact management
- [ ] Push notifications

**Tech Stack beslissing:**
- Native: Swift + Kotlin
- React Native: JavaScript
- PWA: React + Web APIs

---

### FASE 4: Notifications & Sharing (Week 10-11)

#### 4.1 Push Notifications
- [ ] FCM (Firebase Cloud Messaging) setup
- [ ] iOS APNs setup
- [ ] Notification triggers:
  - "Offer ready for [Client Name]"
  - "Your offer expires in 24 hours"
  - "Client viewed your offer"
  - "Client selected option X"

#### 4.2 Sharing Systeem
- [ ] Short URL generator (rbj.nl/o/abc123)
- [ ] QR code generator
- [ ] WhatsApp share deep link
- [ ] Email share template
- [ ] SMS share optie

#### 4.3 Analytics
- [ ] Track offer views
- [ ] Track option selections
- [ ] Track conversion rate
- [ ] Track time-to-offer
- [ ] Track agent satisfaction

**Edge Functions:**
- [ ] `send-notification/index.ts`
- [ ] `generate-short-url/index.ts`
- [ ] `track-offer-view/index.ts`

---

### FASE 5: Testing & Polish (Week 11-12)

#### 5.1 Beta Testing
- [ ] 5 agencies onboarden
- [ ] Training sessies geven
- [ ] Real offers maken
- [ ] Feedback verzamelen
- [ ] Bugs fixen

#### 5.2 Performance
- [ ] Offer generation < 3 minuten (meten)
- [ ] Voice latency < 2 seconden (meten)
- [ ] App load time < 1 seconde
- [ ] Template render < 2 seconden

#### 5.3 Kwaliteit
- [ ] Voice accuracy > 95%
- [ ] Intent detection > 90%
- [ ] Hotel relevantie check
- [ ] Pricing accuracy check
- [ ] Template responsiveness test

#### 5.4 Security
- [ ] Audio data encryptie
- [ ] API key rotation
- [ ] Rate limiting testen
- [ ] RLS policies checken

---

## 📊 Resource Planning

### ✅ GEKOZEN ROUTE: Externe Builder + Web App

**Development team nodig:**
- 1x Full-stack developer (voice + web app + webhooks) - **8 weken**
- 1x Frontend developer (UI/UX + responsive design) - **6 weken**
- 1x Designer (UI/UX wireframes) - **2 weken**

**Timeline:**
- Week 1-2: Setup + database + OpenAI Realtime POC
- Week 3-6: Voice interface (web-based)
- Week 6-8: Externe builder integratie + webhooks
- Week 8-10: UI polish + responsive design
- Week 10-11: Notifications + testing
- Week 11-12: Beta met 5 agencies

**Kosten (eerste 3 maanden):**
- Development: ~€42.000
  - Full-stack: 8 weken × €5.000 = €40.000
  - Designer: 2 weken × €1.000 = €2.000
- OpenAI Realtime API: €5.400/maand × 3 = €16.200
- Externe builder: €2.50 × 1000 offers/maand × 3 = €7.500
- Supabase: ~€100/maand × 3 = €300
- Push notifications (web push): €50/maand × 3 = €150

**TOTAL FIRST 3 MONTHS: ~€66.150**

**Maandelijkse kosten (na launch):**
- OpenAI API: €5.400/maand (bij 100 agents)
- Externe builder: €2.500/maand (1000 offers)
- Supabase: €100/maand
- Hosting/CDN: €50/maand
- **Total recurring: €8.050/maand**

**Break-even:**
- 100 agents × €299/maand = €29.900/maand revenue
- Kosten: €8.050/maand
- **Profit: €21.850/maand** (73% margin!)
- Break-even op development: 3 maanden

---

## 🎯 Milestones

### Week 2: Beslissingen Round
- ✅ Alle tech keuzes gemaakt
- ✅ Beta testers gecommitteerd
- ✅ Database schema klaar

### Week 6: Voice Prototype
- ✅ Agent kan spraak-naar-tekst doen
- ✅ Systeem herkent intent + entities
- ✅ Conversatie flow werkt
- ✅ Demo-able voor stakeholders

### Week 8: Offer Generation Werkt
- ✅ Van voice → structured data → offer URL
- ✅ Template(s) zien er goed uit
- ✅ Mobiele pagina responsive

### Week 10: End-to-End Demo
- ✅ Complete flow werkt
- ✅ Agent kan echt offer maken
- ✅ Client kan offer bekijken
- ✅ Notificaties werken

### Week 12: Beta Launch
- ✅ 5 agencies live
- ✅ 50+ echte offers gemaakt
- ✅ Feedback verzameld
- ✅ Ready for scale

---

## 🚧 Risks & Dependencies

### HIGH RISK:
1. **Voice accuracy Nederlands** - OpenAI is vooral Engels getraind
   - *Mitigation:* Uitgebreid testen, fallback naar Engels

2. **Externe builder levert niet op tijd** - Als je externe route gaat
   - *Mitigation:* SLA in contract, penalty clauses, backup plan

3. **Offer generation te traag** - > 3 minuten = bad UX
   - *Mitigation:* Caching, pre-fetching, parallel API calls

4. **Agents adopteren het niet** - Voice is te onwennig
   - *Mitigation:* Ook text-input optie, gradual rollout

### MEDIUM RISK:
5. **Hotel/Flight API kosten exploderen** - Bij veel volume
   - *Mitigation:* Caching, rate limiting, pricing tiers

6. **Mobile app review rejection** - Apple/Google zeggen nee
   - *Mitigation:* PWA backup, compliance check vooraf

### LOW RISK:
7. **Notificaties niet betrouwbaar** - Push notifications falen
   - *Mitigation:* Email + SMS backup

---

## 📞 Next Actions (Deze Week!)

### ✅ Actie 1: Beslissingen
- ✅ Externe builder: JA (bv Reizen builder)
- ✅ Platform: Web-based (mobile + desktop)
- ✅ Voice: OpenAI Realtime API

### Actie 2: Externe Builder Coordinatie
**Met bestaande bv Reizen builder:**
- [ ] Check API toegang (hebben we al?)
- [ ] Vraag SLA en capaciteit (kunnen ze 1000 offers/maand aan?)
- [ ] Check pricing (nog steeds €2-3 per offer?)
- [ ] Test current API voor offer generation
- [ ] Vraag: kunnen ze voice-to-data input accepteren?

### Actie 3: Budget Goedkeuring
- [ ] Present dit plan aan finance
- [ ] Budget request: **€66.150 voor 3 maanden**
- [ ] Laat ROI zien (73% margin, 3 maanden break-even)
- [ ] Goedkeuring binnen 1 week

### Actie 4: Beta Testers Rekruteren
- [ ] Shortlist 10 travel agencies
- [ ] Pitch meeting inplannen (gebruik VOICE_AGENT_PITCH_DECK.md)
- [ ] Commitment krijgen van minimaal 5 agencies
- [ ] NDA + beta agreement tekenen
- [ ] Gratis toegang eerste 3 maanden (beta deal)

### Actie 5: Tech Spike (deze week, 2 dagen)
**OpenAI Realtime API proof of concept:**
- [ ] API key aanvragen bij OpenAI
- [ ] Simpel web prototype bouwen
- [ ] Voice recording in browser testen
- [ ] Nederlands gesprek testen
- [ ] Latency meten (moet <1 sec zijn)
- [ ] Kosten per sessie valideren

**Test scenario:**
```
"Ik wil naar Las Vegas, 15 tot 22 juni,
twee volwassenen, vier sterren hotel met casino,
vertrek vanaf Amsterdam Schiphol,
budget ongeveer 3000 euro per persoon"
```

- [ ] Transcript accuraat?
- [ ] Intent + entities correct?
- [ ] Response natuurlijk?

### Actie 6: Developer Sourcing (volgende week)
- [ ] Zoek full-stack developer (8 weken beschikbaar)
- [ ] Zoek frontend developer (6 weken beschikbaar)
- [ ] Zoek designer (2 weken beschikbaar)
- [ ] Interviews plannen
- [ ] Start: week van 20 januari 2026

---

## 💰 Business Model (Quick Recap)

### Voor Travel Agents:
- **€299/maand** per agent (unlimited offers)
- Of: **€99/maand** + €2 per offer
- Of: **Freemium** (5 offers gratis, dan betalen)

### ROI voor Agent:
- Oud: 4 offers/dag × €2500 avg = €10K/dag
- Nieuw: 12 offers/dag × €2500 avg = €30K/dag
- **Extra revenue: €20K/dag = €400K/maand**
- App kost €299/maand
- **ROI: 1333x** 🤯

### Voor Ons:
- **Year 1 target:** 100 agents × €299 = €29.9K/maand = **€358K/jaar**
- **Year 2 target:** 500 agents = **€1.79M/jaar**
- **Year 3 target:** 2000 agents = **€7.16M/jaar**

---

## 📅 Timeline Visual

```
Week 1-2:   [BESLISSINGEN] → Kies tech stack
Week 3-6:   [VOICE] → Spraak-naar-tekst + AI conversatie
Week 6-8:   [OFFERS] → Offer generation integratie
Week 8-10:  [MOBILE] → App bouwen + UI polish
Week 10-11: [NOTIFICATIONS] → Push + sharing
Week 11-12: [BETA] → 5 agencies live
Week 13+:   [SCALE] → Open for 100+ agencies
```

---

## ✅ Definition of Done

**Dit project is KLAAR als:**

1. ✅ Agent kan via voice een offer aanvragen (Nederlands)
2. ✅ Systeem genereert offer in < 3 minuten
3. ✅ Offer ziet er professioneel uit (mobile-first)
4. ✅ Agent krijgt notificatie als offer klaar is
5. ✅ Agent kan offer delen via WhatsApp
6. ✅ Client kan offer bekijken op mobiel
7. ✅ 5 beta agencies gebruiken het dagelijks
8. ✅ 100+ real offers gemaakt en positieve feedback
9. ✅ System uptime > 99%
10. ✅ Ready to scale naar 100+ agencies

---

## 🤔 Open Questions

1. ✅ **Externe builder:** Zelfde als bij bv Reizen (al opgelost)
2. ✅ **Platform:** Web-based, mobile + desktop (al opgelost)
3. ✅ **Voice engine:** OpenAI Realtime API (al opgelost)
4. ❓ **Hebben we al prototype voice UI designs?**
5. ❓ **Wie wordt product owner van dit project?**
6. ❓ **Wat is ons launch marketing plan?**
7. ❓ **Gaan we dit eerst intern testen voor eigen GoWild reizen?**
8. ❓ **Hoe verhouden dit zich tot bestaande TravelBro WhatsApp bot?**
9. ❓ **Kunnen we TravelBro tech hergebruiken?** (heeft al trip generation logica)
10. ❓ **Externe builder API details:** Hebben we al toegang? Wat is hun SLA?

---

## 📎 Related Documents

- `VOICE_AGENT_EXTERNAL_BUILDER_BRIEFING.md` - Tech specs voor builder
- `VOICE_AGENT_PITCH_DECK.md` - Sales pitch & vision
- `TRAVELBRO_V2_UPGRADE.md` - Huidige WhatsApp trip bot (mogelijk te hergebruiken)

---

---

## 📌 Executive Summary

### ✅ Wat is Besloten:
1. **Externe builder JA** - Gebruiken dezelfde als bij bv Reizen (bewezen tech)
2. **Web-based platform** - Werkt op mobile + desktop (geen app store gedoe)
3. **OpenAI Realtime API** - Beste voice kwaliteit, geen compromissen

### 💰 Financiën:
- **Investering:** €66.150 (3 maanden development)
- **Maandelijkse kosten:** €8.050 (APIs + builder + hosting)
- **Break-even:** 3 maanden (bij 100 agents)
- **Profit margin:** 73% (€21.850/maand bij 100 agents)

### 🎯 Timeline:
- **Week 1-2:** Database + OpenAI POC
- **Week 3-6:** Voice interface
- **Week 6-8:** Builder integratie
- **Week 8-10:** UI polish
- **Week 10-11:** Testing
- **Week 11-12:** Beta (5 agencies)
- **Week 13+:** Scale naar 100+ agencies

### 👥 Team Nodig:
- 1x Full-stack developer (8 weken)
- 1x Frontend developer (6 weken)
- 1x Designer (2 weken)

### 🚀 Next Steps (Deze Week):
1. ✅ Beslissingen genomen
2. Check externe builder API toegang
3. Budget goedkeuring (€66K)
4. Beta testers rekruteren (5 agencies)
5. OpenAI Realtime API POC (2 dagen)
6. Developers sourcing

### 📈 Expected Results Year 1:
- **100 agents** × €299/maand = **€358.800 revenue**
- Kosten: €96.600 (€8.050 × 12)
- **Profit Year 1: €262.200**

---

**Status:** ✅ Beslissingen compleet → Ready to execute
**Next:** Budget goedkeuring + tech spike
**Owner:** TBD
**Start development:** Week van 20 januari 2026

---

*Gemaakt: 8 januari 2026*
*Laatste update: 9 januari 2026*
