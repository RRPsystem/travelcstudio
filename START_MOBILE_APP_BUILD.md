# 🚀 Quick Start: Agent Mobile App Build

> **Geef dit document aan de AI in de nieuwe Bolt omgeving**

---

## 👋 Hoi AI Agent!

Je gaat een **React Native mobile app** bouwen voor reisagenten. Deze app is een **mobile interface** op een bestaand platform dat al volledig operationeel is.

### 📖 Lees Eerst Deze Documenten

Je hebt toegang tot 2 uitgebreide documenten gekregen:

1. **`AGENT_MOBILE_APP_BRIEFING.md`**
   → Dit is je COMPLETE build guide met alle specs, code voorbeelden, en features

2. **`AGENT_MOBILE_APP_INTEGRATION.md`**
   → Dit legt uit HOE je app integreert met het bestaande web platform

**Lees beide documenten volledig voordat je begint met bouwen!**

---

## 🎯 Wat Je Gaat Bouwen

Een **React Native (Expo) mobile app** met deze features:

1. ✅ **Login** voor agent users
2. ✅ **Dashboard** met stats en pending items
3. ✅ **Trip Catalog** om reizen te browsen
4. ✅ **Voice-to-Offer** (HOOFDFEATURE!) - Agent spreekt offer in, AI maakt er een gestructureerde offer van
5. ✅ **Client Management** - Bekijk en beheer klanten
6. ✅ **Profile** - Agent profiel bekijken/bewerken
7. ✅ **Push Notifications** - Voor brand approvals

---

## 🔧 Tech Stack

```json
{
  "platform": "React Native + Expo",
  "language": "TypeScript",
  "database": "Supabase (SHARED met web platform!)",
  "auth": "Supabase Auth (SHARED!)",
  "styling": "NativeWind (Tailwind for React Native)",
  "navigation": "Expo Router"
}
```

---

## 📋 Setup Instructies

### Stap 1: Project Aanmaken

```bash
npx create-expo-app agent-mobile-app --template blank-typescript
cd agent-mobile-app

# Core dependencies
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install nativewind
npm install expo-av expo-haptics expo-notifications
npm install lucide-react-native

# Navigation
npx expo install expo-router react-native-safe-area-context react-native-screens
```

### Stap 2: Environment Setup

De gebruiker zal je deze credentials geven:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Stap 3: Kopieer Types

De gebruiker zal je een `types/database.ts` file geven.
**Kopieer deze EXACT zoals hij is!** Dit zijn de TypeScript types van het web platform.

### Stap 4: Build Core Features

Volg de gedetailleerde instructies in `AGENT_MOBILE_APP_BRIEFING.md` om te bouwen:

1. **Auth systeem** (dag 1)
2. **Dashboard + Trips** (dag 2)
3. **Voice-to-Offer** (dag 3-4) ← DIT IS DE KILLER FEATURE!
4. **Clients + Profile** (dag 4)
5. **Real-time + Notifications** (dag 5)

---

## ⚠️ Belangrijke Regels

### 🚨 DATABASE REGEL #1
**JE MAAKT GEEN DATABASE WIJZIGINGEN!**

De database is al volledig opgezet. Jij leest en schrijft alleen data in bestaande tables.

### 🚨 SECURITY REGEL #2
**GEBRUIK ALLEEN ANON KEY, NOOIT SERVICE ROLE KEY!**

Row Level Security (RLS) in de database zorgt voor security. Gebruik altijd de anon key.

### 🚨 SYNC REGEL #3
**HET IS GEEN STANDALONE APP!**

De mobile app en web dashboard delen dezelfde database. Alles wat je in mobile app doet, moet ook in web dashboard zichtbaar zijn (en vice versa).

---

## 🎤 Voice-to-Offer Feature (FOCUS!)

Dit is de **belangrijkste feature** van de app:

**Flow:**
1. Agent drukt microfoon knop
2. Agent praat over een reis (freestyle)
3. App neemt audio op
4. Audio → Supabase Storage
5. Call Edge Function `transcribe-audio` (Whisper API)
6. Call Edge Function `generate-offer-from-voice` (GPT-4)
7. Toon preview van gegenereerde offer
8. Agent kan bewerken
9. Submit naar brand voor goedkeuring
10. Brand goedkeurt in web dashboard
11. Agent krijgt push notification

**Zie AGENT_MOBILE_APP_BRIEFING.md sectie "Feature 3: Voice-to-Offer" voor complete code!**

---

## 📞 Vragen Voor De Gebruiker

Als je vast loopt, vraag dan om:

### Database Vragen
- "Kan ik de schema van table X zien?"
- "Welke RLS policies gelden voor agent users?"

### Edge Function Vragen
- "Bestaat Edge Function Y al?"
- "Kan je de `transcribe-audio` function voor me maken?" (deze is nieuw!)
- "Kan je de `generate-offer-from-voice` function voor me maken?" (deze is nieuw!)

### Integration Vragen
- "Kan ik testen met een demo agent account?"
- "Hoe kan ik real-time sync testen?"

---

## ✅ Definition of Done

Je app is af als:

- [x] Agent kan inloggen met bestaande credentials
- [x] Agent ziet alleen data van zijn eigen brand (RLS werkt!)
- [x] Agent kan trips browsen
- [x] Agent kan voice offer maken (MIC → AI → PREVIEW → SUBMIT)
- [x] Agent kan clients beheren
- [x] Agent krijgt push notification bij brand approval
- [x] Real-time sync werkt (test met web dashboard tegelijk open!)
- [x] App werkt offline (cached data)

---

## 🎯 Start Hier!

**Stap 1:** Lees volledig `AGENT_MOBILE_APP_BRIEFING.md`

**Stap 2:** Lees volledig `AGENT_MOBILE_APP_INTEGRATION.md`

**Stap 3:** Setup project zoals hierboven

**Stap 4:** Begin met auth (belangrijkste fundament!)

**Stap 5:** Build feature voor feature volgens planning

**Stap 6:** Test integratie met web dashboard

**Stap 7:** Polish & deploy!

---

## 💬 Communicatie Met Web Platform

De mobile app **communiceert niet rechtstreeks met het web platform**.

In plaats daarvan:
- Beide apps praten met **Supabase** (shared database)
- Beide apps luisteren naar **real-time events**
- Beide apps gebruiken **dezelfde Edge Functions**

**Het is één systeem met twee interfaces!**

```
Mobile App ──────┐
                 ├──► SUPABASE ◄────┐
Web Dashboard ───┘                  │
                                    │
         Shared: Database, Auth, Functions, Storage
```

---

## 🎉 Veel Succes!

Je hebt alle informatie die je nodig hebt in de twee briefing documenten.

**Follow the docs, ask questions when stuck, and build something awesome! 💪**

---

**P.S.** De voice-to-offer feature is echt next-level. Agent spreekt vrij over een reis, AI maakt er een professionele offer van. Dat is de magic! 🎤✨
