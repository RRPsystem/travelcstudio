# Twilio WhatsApp Setup Guide voor TravelBRO

## Stap 1: Twilio Account Aanmaken

1. Ga naar [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Maak een gratis account aan (credit card vereist voor verificatie)
3. Verifieer je email en telefoonnummer
4. Je krijgt $15 gratis trial credit

## Stap 2: WhatsApp Sandbox Activeren (GRATIS voor testen)

### A. Ga naar WhatsApp Sandbox:
1. Log in op [Twilio Console](https://console.twilio.com/)
2. Ga naar: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Of direct: [https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)

### B. Activeer de Sandbox:
1. Je ziet een scherm met een **JOIN CODE** zoals: `join kitchen-select`
2. Open WhatsApp op je telefoon
3. Stuur een bericht naar het **Twilio nummer** (bijv. +1 415 523 8886)
4. Type exact: `join kitchen-select` (of wat je ziet in de console)
5. Je ontvangt: "✅ You are all set! Your sandbox is ready."

**BELANGRIJK:** Deze sandbox nummer is ALLEEN voor testen! Elke gebruiker moet eerst `join [code]` sturen.

## Stap 3: Twilio Credentials Vinden

### A. Account SID en Auth Token:
1. Ga naar [Twilio Console Dashboard](https://console.twilio.com/)
2. Rechts bovenaan zie je:
   - **Account SID**: `AC1234567890abcdef...` (34 karakters)
   - **Auth Token**: Klik op "Show" → `1234567890abcdef...` (32 karakters)
3. **Kopieer beide!**

### B. WhatsApp Sandbox Nummer:
1. Ga naar **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Je ziet: **Sandbox Phone Number**: `+1 415 523 8886` (of vergelijkbaar)
3. **Kopieer dit nummer inclusief +**

## Stap 4: Webhook URL Configureren in Twilio

### A. Bepaal je Webhook URL:
Je webhook URL is:
```
https://[JOUW-SUPABASE-PROJECT].supabase.co/functions/v1/whatsapp-webhook
```

Voorbeeld:
```
https://xyzabcdefghijk.supabase.co/functions/v1/whatsapp-webhook
```

### B. Stel Webhook in:
1. Ga naar: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Scroll naar **Sandbox Configuration**
3. Vind: **WHEN A MESSAGE COMES IN**
4. Plak je webhook URL
5. Method: **POST**
6. Klik **Save**

## Stap 5: Credentials Invoeren in TravelBRO

### A. Als Operator:
1. Log in als Operator
2. Ga naar **API Settings**
3. Scroll naar **Twilio WhatsApp Instellingen**
4. Selecteer de Brand
5. Vul in:
   - **Twilio Account SID**: `AC1234567890abcdef...`
   - **Twilio Auth Token**: `1234567890abcdef...`
   - **Twilio WhatsApp Number**: `+14155238886`
6. Klik **Opslaan**

### B. Als Brand (TravelBRO Trip):
1. Log in als Brand
2. Ga naar **TravelBRO** → selecteer je Trip
3. Klik op **WhatsApp** tab
4. Vink aan: ✅ **WhatsApp integratie inschakelen**
5. Vul in:
   - **WhatsApp Nummer**: `+14155238886` (zelfde als Twilio Sandbox)
   - **Welkomstbericht**: Pas aan naar wens
6. Klik **Opslaan**

## Stap 6: TESTEN!

### Test met Sandbox:
1. Open WhatsApp op je telefoon
2. Je moet EERST de sandbox joinen: stuur `join [code]` naar +1 415 523 8886
3. Stuur daarna een bericht: "Hoi! Hoe laat is het zwembad open?"
4. TravelBRO antwoordt automatisch! 🎉

### Test Voice Messages:
1. Druk en houd de microfoon knop in WhatsApp
2. Spreek in: "Waar is het restaurant?"
3. TravelBRO transcribeert en antwoordt!

### Test Locaties:
1. Vraag: "Waar is de pizzeria?"
2. TravelBRO stuurt Google Maps link 📍

---

## UPGRADE NAAR PRODUCTIE (BETAALD)

### Sandbox Beperkingen:
- ❌ Elke gebruiker moet `join [code]` sturen
- ❌ Sandbox kan elke 3 dagen resetten
- ❌ Beperkt aantal berichten per dag
- ❌ Niet geschikt voor echte klanten

### WhatsApp Business Account (Productie):

#### Optie 1: Twilio WhatsApp Business Profile
**Kosten:** ~$15/maand basis
1. Ga naar: **Messaging** → **Senders** → **WhatsApp senders**
2. Klik **Request to enable my Twilio WhatsApp number**
3. Vul bedrijfsgegevens in
4. Facebook Business Manager account vereist
5. Goedkeuring duurt 1-3 dagen

**Je krijgt:**
- ✅ Eigen WhatsApp Business nummer
- ✅ Geen join code nodig
- ✅ Ongelimiteerde berichten
- ✅ Verified Business Profile
- ✅ Geschikt voor klanten

#### Optie 2: WhatsApp Business API Direct
Als je veel volume hebt, kun je ook direct met WhatsApp werken:
- [Meta WhatsApp Business Platform](https://business.whatsapp.com/)
- Meer controle, maar complexer

---

## KOSTEN OVERZICHT

### Sandbox (GRATIS):
- ✅ Gratis voor testen
- ✅ $15 trial credit
- ❌ Join code vereist
- ❌ Niet voor productie

### Twilio WhatsApp Business:
- 💰 **Basis:** ~$15/maand
- 💰 **Conversation-based pricing:**
  - Gratis: eerste 1.000 user-initiated conversations per maand
  - Daarna: €0,03 - €0,10 per conversatie (afhankelijk van land)

**Berichten kosten:**
- Inkomend: gratis
- Uitgaand binnen 24-uur window: gratis
- Uitgaand buiten 24-uur: €0,045 per bericht

**Voorbeeld kosten:**
- 100 klanten die 5 berichten sturen: ~€0-5/maand
- 1.000 klanten die 5 berichten sturen: ~€15-30/maand

---

## TROUBLESHOOTING

### "No response from TravelBRO"
✅ Check:
1. Heb je `join [code]` gestuurd? (sandbox only)
2. Is WhatsApp enabled in Trip settings?
3. Zijn Twilio credentials correct?
4. Is OpenAI API key geconfigureerd?

### "Webhook not working"
✅ Check:
1. Webhook URL correct ingevoerd in Twilio?
2. Method is POST (niet GET)?
3. Check Supabase Edge Function logs

### "Voice messages not transcribing"
✅ Check:
1. OpenAI API key heeft credits?
2. Check Edge Function logs voor errors
3. Probeer opnieuw met duidelijkere audio

### "No media/locations sent"
✅ Check:
1. Test met: "Stuur me een foto van het hotel"
2. Of: "Waar is het restaurant precies?"
3. AI moet specifiek vragen om foto/locatie

---

## VOLGENDE STAPPEN

1. ✅ Start met **Sandbox** voor testen
2. ✅ Test alle features (text, voice, media, locations)
3. ✅ Test met meerdere reizigers
4. ✅ Als alles werkt → upgrade naar **WhatsApp Business**
5. ✅ Configure je eigen WhatsApp Business nummer
6. ✅ Update settings in TravelBRO met nieuwe nummer
7. ✅ Launch voor echte klanten! 🚀

---

## SUPPORT

- **Twilio Docs:** [https://www.twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **Twilio Support:** [https://support.twilio.com](https://support.twilio.com)
- **WhatsApp Business:** [https://business.whatsapp.com/](https://business.whatsapp.com/)

**Happy WhatsApping! 🎉**
