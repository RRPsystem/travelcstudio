# WhatsApp Business Direct Setup - Geen Sandbox

Deze guide helpt je **direct** WhatsApp Business op te zetten zonder sandbox, klaar voor productie!

---

## 📋 Wat je nodig hebt:

1. ✅ Twilio account (credit card vereist)
2. ✅ Facebook Business Manager account
3. ✅ Geldige bedrijfsgegevens (KVK, BTW nummer)
4. ✅ Verificeerbare telefoonnummer
5. ✅ Budget: ~€15-30/maand

**Tijdsduur:** ~30 minuten setup + 1-3 dagen goedkeuring

---

## Stap 1: Twilio Account Aanmaken

### A. Maak Account:
1. Ga naar: [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Vul je gegevens in:
   - Email
   - Wachtwoord
   - Telefoonnummer (voor verificatie)
3. Verifieer je email
4. **Voeg credit card toe** (vereist voor WhatsApp Business)

### B. Upgrade naar Paid Account:
1. Ga naar: [Console Dashboard](https://console.twilio.com/)
2. Klik op je account naam → **Billing**
3. **Upgrade to Paid Account**
4. Voeg credit toe (minimaal $20 aangeraden)

---

## Stap 2: Facebook Business Manager Account

WhatsApp Business vereist een Facebook Business Manager account.

### A. Maak Business Manager:
1. Ga naar: [https://business.facebook.com/](https://business.facebook.com/)
2. Klik **Create Account**
3. Vul bedrijfsgegevens in:
   - Bedrijfsnaam
   - Je naam
   - Email

### B. Verifieer Bedrijf:
Facebook kan vragen om:
- KVK nummer
- BTW nummer
- Bedrijfsadres
- Officiële documenten

**Dit kan 1-3 werkdagen duren.**

---

## Stap 3: WhatsApp Business Nummer Aanvragen in Twilio

### A. Ga naar WhatsApp Senders:
1. Log in op [Twilio Console](https://console.twilio.com/)
2. Ga naar: **Messaging** → **Senders** → **WhatsApp senders**
3. Of direct: [https://console.twilio.com/us1/develop/sms/senders/whatsapp](https://console.twilio.com/us1/develop/sms/senders/whatsapp)

### B. Request WhatsApp Sender:
1. Klik **Request to enable my Twilio WhatsApp number**
2. Je ziet een wizard met verschillende opties:

**Optie A: Gebruik bestaand Twilio nummer**
- Als je al een Twilio telefoonnummer hebt
- Klik **Use existing Twilio number**
- Selecteer nummer
- Kost: gratis (alleen WhatsApp conversatie kosten)

**Optie B: Koop nieuw nummer**
- Klik **Buy a new Twilio number**
- Kies land (bijv. Nederland +31)
- Kies nummer
- Kost: ~$1-2/maand voor het nummer

**Optie C: Gebruik je eigen nummer**
- Klik **Use my own number**
- Vul je eigen bedrijfsnummer in
- Verificatie via SMS code

### C. Connect Facebook Business Manager:
1. Je wordt doorverwezen naar Facebook
2. Log in met je Business Manager account
3. **Accepteer permissies** voor Twilio
4. Kies je Business Manager account

### D. Vul Business Profile in:
Twilio vraagt om:
- **Business Name**: Je officiële bedrijfsnaam
- **Business Description**: Wat doe je? (bijv. "Reisorganisatie")
- **Business Category**: Selecteer "Travel & Hospitality"
- **Business Website**: Je website URL
- **Business Address**: Volledig adres
- **Business Email**: Contact email
- **Business Phone**: Contact telefoon

### E. WhatsApp Display Name:
- **Display Name**: Wat klanten zien in WhatsApp (bijv. "TravelCompany")
- **About**: Korte beschrijving (bijv. "Your travel assistant")

### F. Submit for Review:
1. Check alle gegevens
2. Klik **Submit for Review**
3. Meta/WhatsApp gaat je aanvraag beoordelen

**Goedkeuring duurt meestal 1-3 werkdagen.**

---

## Stap 4: Wachten op Goedkeuring

### Wat gebeurt er nu?
- Meta/WhatsApp beoordeelt je aanvraag
- Ze checken bedrijfsgegevens
- Ze controleren Facebook Business Manager
- Je ontvangt email bij goedkeuring

### Status Checken:
1. Ga naar: **Messaging** → **Senders** → **WhatsApp senders**
2. Status kan zijn:
   - ⏳ **Pending**: Wachten op goedkeuring
   - ✅ **Approved**: Goedgekeurd! Klaar voor gebruik
   - ❌ **Rejected**: Afgewezen (zie email voor reden)

---

## Stap 5: Na Goedkeuring - Configuratie

### A. Vind je Credentials:
1. Ga naar [Twilio Console Dashboard](https://console.twilio.com/)
2. Rechts bovenaan zie je:
   - **Account SID**: `AC1234567890abcdef...`
   - **Auth Token**: Klik "Show" → `1234567890abcdef...`

### B. Vind je WhatsApp Nummer:
1. Ga naar: **Messaging** → **Senders** → **WhatsApp senders**
2. Je ziet je goedgekeurde nummer: bijv. `+31612345678`
3. **Kopieer dit nummer inclusief +**

### C. Configureer Webhook:
1. Klik op je WhatsApp sender
2. Scroll naar **Webhook Configuration**
3. Vind: **WHEN A MESSAGE COMES IN**
4. Plak je webhook URL:
   ```
   https://[JOUW-PROJECT].supabase.co/functions/v1/whatsapp-webhook
   ```
5. Method: **POST**
6. Klik **Save**

---

## Stap 6: TravelBRO Configureren

### A. Als Operator - API Settings:
1. Log in als Operator
2. Ga naar **API Settings**
3. Scroll naar **Twilio WhatsApp Instellingen**
4. Selecteer de Brand
5. Vul in:
   - **Twilio Account SID**: `AC1234567890abcdef...`
   - **Twilio Auth Token**: `1234567890abcdef...`
   - **Twilio WhatsApp Number**: `+31612345678` (je WhatsApp Business nummer)
6. Klik **Opslaan**

### B. Als Brand - TravelBRO Trip:
1. Log in als Brand
2. Ga naar **TravelBRO** → selecteer je Trip
3. Klik op **WhatsApp** tab
4. Vink aan: ✅ **WhatsApp integratie inschakelen**
5. Vul in:
   - **WhatsApp Nummer**: `+31612345678` (zelfde als hierboven)
   - **Welkomstbericht**: Pas aan naar wens
6. Klik **Opslaan**

---

## Stap 7: LIVE TESTEN! 🚀

### Test zonder Join Code:
1. Open WhatsApp op je telefoon
2. **GEEN join code nodig!** Dit is productie!
3. Stuur direct een bericht naar je WhatsApp Business nummer
4. TravelBRO antwoordt automatisch! 🎉

### Test alle features:
- ✅ **Tekst**: "Hoe laat is het zwembad open?"
- ✅ **Voice**: Spreek in: "Waar is het restaurant?"
- ✅ **Locatie**: "Stuur me de locatie van het hotel"
- ✅ **Foto's**: "Laat een foto van het zwembad zien"

---

## 💰 Kosten Overzicht (Productie)

### Setup Kosten:
- **Twilio Account**: Gratis
- **Telefoonnummer**: €1-2/maand (als je nieuw nummer koopt)
- **WhatsApp Business**: Gratis activatie

### Maandelijkse Kosten:
- **Basis**: ~€0-15/maand (afhankelijk van gebruik)
- **Conversaties**:
  - Eerste 1.000 user-initiated conversaties: **GRATIS**
  - Daarna: €0,03 - €0,10 per conversatie

### Berichten Kosten:
- **Inkomend**: Altijd gratis
- **Uitgaand binnen 24-uur window**: Gratis (na ontvangen bericht)
- **Uitgaand buiten 24-uur**: €0,045 per bericht

### Realistische Voorbeelden:
**Scenario 1: Kleine reisorganisatie**
- 50 reizigers per maand
- Gemiddeld 5 berichten per reiziger
- Kosten: **€0-5/maand**

**Scenario 2: Middelgrote reisorganisatie**
- 500 reizigers per maand
- Gemiddeld 8 berichten per reiziger
- Kosten: **€10-25/maand**

**Scenario 3: Grote reisorganisatie**
- 2.000 reizigers per maand
- Gemiddeld 10 berichten per reiziger
- Kosten: **€50-100/maand**

---

## ⚠️ Belangrijk: Message Templates

Voor **business-initiated messages** (berichten die JIJ start buiten 24-uur window) moet je **Message Templates** gebruiken.

### Message Templates Aanmaken:
1. Ga naar: **Messaging** → **Senders** → je WhatsApp sender
2. Klik **Templates**
3. Klik **Create Template**
4. Vul in:
   - **Name**: bijv. "trip_reminder"
   - **Category**: Bijv. "Utility"
   - **Language**: Nederlands
   - **Body**: "Hoi {{1}}! Je reis naar {{2}} begint over {{3}} dagen. Heb je nog vragen?"

Templates moeten **goedgekeurd** worden door WhatsApp (duurt 24-48 uur).

**Voor TravelBRO:** Meestal niet nodig! Reizigers starten gesprek, dus je antwoordt binnen 24-uur window.

---

## 🔍 Troubleshooting

### "Aanvraag afgewezen"
Redenen:
- Onvolledige bedrijfsgegevens
- Geen geverifieerd Facebook Business Manager
- Verdachte activiteit op account
- Website niet bereikbaar

**Oplossing:**
- Check email van Meta voor specifieke reden
- Los op en dien opnieuw in
- Contact Twilio Support: [support.twilio.com](https://support.twilio.com)

### "Webhook niet werkend"
Check:
1. Is webhook URL correct? (inclusief https://)
2. Is method POST? (niet GET)
3. Check Supabase Edge Function logs
4. Test webhook met Postman/curl

### "Berichten komen niet aan"
Check:
1. Is nummer correct ingevoerd? (inclusief +)
2. Zijn Twilio credentials correct?
3. Is OpenAI API key geconfigureerd?
4. Check Twilio logs: Console → Monitor → Logs

---

## ✅ Checklist: Ben je klaar?

- [ ] Twilio Paid account
- [ ] Facebook Business Manager geverifieerd
- [ ] WhatsApp Business sender aangevraagd
- [ ] Goedkeuring ontvangen van Meta/WhatsApp
- [ ] Credentials in TravelBRO ingevuld (Operator)
- [ ] WhatsApp enabled in Trip settings (Brand)
- [ ] Webhook geconfigureerd in Twilio
- [ ] Getest met je telefoon
- [ ] Voice messages werken
- [ ] Locaties worden gestuurd
- [ ] Foto's worden verstuurd

---

## 🎉 Success!

Je WhatsApp Business is nu LIVE en productie-ready!

Klanten kunnen direct met TravelBRO chatten via WhatsApp zonder join code of sandbox beperkingen.

**Alle premium features zijn actief:**
- 💬 Natuurlijke conversaties
- 🎤 Spraakberichten
- 📍 Locaties delen
- 🖼️ Foto's versturen

---

## 📚 Resources

- **Twilio WhatsApp Docs**: [https://www.twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **WhatsApp Business API**: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Twilio Support**: [https://support.twilio.com](https://support.twilio.com)
- **Facebook Business Help**: [https://www.facebook.com/business/help](https://www.facebook.com/business/help)

**Happy WhatsApping! 🚀**
