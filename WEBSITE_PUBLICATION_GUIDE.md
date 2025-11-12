# 🌐 Website Publicatie Gids

## Volledige stappen om je website live te zetten

---

## 📋 Overzicht van het proces

Het publiceren van een website met een eigen domein bestaat uit **5 hoofdstappen**:

```
1. Website Maken
   ↓
2. Pagina's Toevoegen
   ↓
3. Menu & Footer Configureren
   ↓
4. Domein Koppelen
   ↓
5. DNS Instellen & Verifiëren
```

---

## 1️⃣ Stap 1: Website Maken

### In Brand Dashboard:

1. Ga naar **Website Management** → **Nieuwe Pagina**
2. Of: Klik op quick action **"Nieuwe Pagina"**

Dit maakt automatisch:
- ✅ Een website entry in database
- ✅ Je eerste pagina (meestal homepage)

### Database structuur:

```sql
websites
├── id
├── brand_id
├── name
├── domain (subdomain voor preview)
└── created_at

website_pages
├── id
├── website_id
├── title
├── slug
├── content_json (de HTML/CSS/componenten)
└── is_published
```

---

## 2️⃣ Stap 2: Pagina's Aanmaken

### Via Page Builder:

**Website Management → Nieuwe Pagina:**

1. **Kies een template** of start leeg
2. **Bouw je pagina** met drag-and-drop componenten:
   - Hero sectie
   - Text blocks
   - Afbeeldingen
   - Galerijen
   - Contact formulieren
   - Booking forms
   - etc.

3. **Sla op** als draft of publiceer direct

### Pagina types:

- **Homepage** (`/` of `/index`)
- **Over ons** (`/over-ons`)
- **Contact** (`/contact`)
- **Bestemmingen** (`/bestemmingen`)
- **Reizen** (`/reizen`)
- Custom pagina's

---

## 3️⃣ Stap 3: Menu & Footer

### Menu Configureren:

**Website Management → Menu Beheer:**

```json
{
  "items": [
    { "label": "Home", "url": "/" },
    { "label": "Bestemmingen", "url": "/bestemmingen" },
    { "label": "Reizen", "url": "/reizen" },
    { "label": "Over Ons", "url": "/over-ons" },
    { "label": "Contact", "url": "/contact" }
  ]
}
```

### Footer Configureren:

**Website Management → Footer Beheer:**

- Contact informatie
- Social media links
- Privacy policy
- Terms & conditions
- Copyright tekst

---

## 4️⃣ Stap 4: Domein Koppelen (Jouw Situatie)

### In Brand Dashboard:

**Brand Settings → Domain Settings:**

### A. Domein Toevoegen:

1. Klik **"Domein Toevoegen"**
2. Vul in: `ai-reisagent.online`
3. Selecteer website: **"Golf Reizen Website"** (of hoe je website heet)
4. Klik **"Toevoegen"**

### B. DNS Verificatie Token:

Je krijgt een **verification token**, bijvoorbeeld:
```
_vercel-verify: abc123def456
```

Dit moet je als **TXT record** toevoegen bij je domain provider.

---

## 5️⃣ Stap 5: DNS Configuratie

### DNS Records instellen bij je Domain Provider:

Op basis van je screenshot heb je **3 DNS records** nodig:

### ✅ 1. TXT Record (Verificatie)
```
Type:  TXT
Name:  _bolt-verify  (of _vercel-verify)
Value: [jouw verification token uit dashboard]
TTL:   3600
```

**❌ Fout in je screenshot:** Er staat `_bolt-verify` maar het moet je eigen token zijn!

### ✅ 2. A Record (Hoofddomein)
```
Type:  A
Name:  @ (of laat leeg voor root domain)
Value: 76.76.21.21
TTL:   3600
```

Dit wijst `ai-reisagent.online` naar de server.

### ✅ 3. CNAME Record (WWW subdomain)
```
Type:  CNAME
Name:  www
Value: cname.vercel-dns.com
TTL:   3600
```

Dit wijst `www.ai-reisagent.online` naar hetzelfde als het hoofddomein.

---

## 🔧 Stap-voor-Stap DNS Setup

### Bij je Domain Provider (bijv. TransIP, Antagonist, etc.):

1. **Log in** bij je domain provider
2. Ga naar **DNS Management** voor `ai-reisagent.online`
3. **Verwijder oude records** (als die er zijn)
4. **Voeg toe:**

#### Record 1: Verificatie
```
Type: TXT
Hostname: _bolt-verify
Value: [kopieer uit Brand Dashboard → Domain Settings]
```

#### Record 2: Hoofddomein
```
Type: A
Hostname: @ (of ai-reisagent.online)
Value: 76.76.21.21
```

#### Record 3: WWW
```
Type: CNAME
Hostname: www
Value: cname.vercel-dns.com
```

4. **Sla op** en wacht 5-60 minuten voor DNS propagatie

---

## ✅ Verificatie in Dashboard

### Terug in Brand Dashboard:

1. Ga naar **Brand Settings → Domain Settings**
2. Vind je domein `ai-reisagent.online`
3. Klik op **"Verifieer DNS"** knop (🔄 icoon)

### Status updates:

- 🟡 **Pending** - DNS records nog niet gevonden
- 🟢 **Verified** - DNS correct geconfigureerd!
- 🔴 **Failed** - DNS records niet correct

### Als status VERIFIED is:

- SSL certificaat wordt automatisch aangevraagd
- Je website wordt automatisch gedeployed
- Binnen 5-10 minuten is je site live!

---

## 🌐 Website Publicatie Systeem

### Hoe het werkt achter de schermen:

```
1. User maakt pagina's in Page Builder
   ↓
2. Content wordt opgeslagen in `website_pages` tabel
   ↓
3. Domein wordt gekoppeld in `brand_domains` tabel
   ↓
4. DNS verificatie gebeurt via Edge Function
   ↓
5. Website wordt gebouwd en deployed
   ↓
6. SSL certificaat wordt automatisch aangevraagd
   ↓
7. Website is LIVE op jouw domein!
```

### Edge Functions betrokken:

- **`verify-domain`** - Controleert DNS records
- **`website-viewer`** - Serveert de website op het domein
- **`pages-api`** - API voor pagina content

---

## 🐛 Troubleshooting: Waarom krijg je een error?

### Mogelijke oorzaken:

### 1️⃣ **Verification Token Mismatch**

**Probleem:** De TXT record in je DNS komt niet overeen met de token in de database.

**Oplossing:**
1. Ga naar Brand Dashboard → Domain Settings
2. Bekijk de **exacte verification token**
3. Kopieer deze **precies** (geen spaties!)
4. Update je TXT record bij domain provider

### 2️⃣ **Geen Website Gekoppeld**

**Probleem:** Je domein is toegevoegd maar niet gekoppeld aan een website.

**Oplossing:**
1. Maak eerst een website met pagina's
2. Ga naar Domain Settings
3. Klik "Edit" bij je domein
4. Selecteer de website
5. Sla op

### 3️⃣ **DNS Nog Niet Gepropageerd**

**Probleem:** DNS records zijn ingesteld maar nog niet wereldwijd verspreid.

**Oplossing:**
- Wacht 5-60 minuten
- Check DNS propagatie op: https://dnschecker.org
- Probeer opnieuw te verifiëren

### 4️⃣ **Verkeerde IP Adres**

**Probleem:** A record wijst naar verkeerd IP.

**Juiste waarde:**
```
A record: 76.76.21.21
```

**Check in dashboard:** Er staat welk IP adres verwacht wordt.

---

## 📝 Complete Checklist

### Voordat je domein koppelt:

- [ ] Website aangemaakt in systeem
- [ ] Minimaal 1 pagina gepubliceerd
- [ ] Menu geconfigureerd
- [ ] Footer geconfigureerd
- [ ] Preview bekeken en goedgekeurd

### DNS Setup:

- [ ] TXT record: `_bolt-verify` met verification token
- [ ] A record: `@` wijst naar `76.76.21.21`
- [ ] CNAME record: `www` wijst naar `cname.vercel-dns.com`
- [ ] DNS propagatie voltooid (check dnschecker.org)

### Verificatie:

- [ ] Domein status = "Verified" in dashboard
- [ ] SSL certificaat = "Active"
- [ ] Website bereikbaar op http://ai-reisagent.online
- [ ] Website bereikbaar op https://ai-reisagent.online
- [ ] WWW redirect werkt

---

## 🚀 Quick Start voor Golf Brand

### Voor jouw specifieke situatie:

### Stap 1: Check Website Aanwezig
```
Brand Dashboard → Website Management → Pagina Beheer
```
Heb je al pagina's? Ja? Ga verder naar stap 2.
Nee? Maak eerst pagina's aan!

### Stap 2: Domein Koppelen
```
Brand Settings → Domain Settings → "Domein Toevoegen"

Domein: ai-reisagent.online
Website: [selecteer je Golf website]
```

### Stap 3: Kopieer Verification Token
```
Je ziet nu:
TXT record: _bolt-verify
Value: [lange string met letters en cijfers]

Kopieer deze VALUE!
```

### Stap 4: DNS bij Provider
```
Bij je domain provider (waar je ai-reisagent.online hebt gekocht):

1. TXT record toevoegen:
   Name: _bolt-verify
   Value: [geplakte verification token]

2. A record toevoegen:
   Name: @
   Value: 76.76.21.21

3. CNAME record toevoegen:
   Name: www
   Value: cname.vercel-dns.com
```

### Stap 5: Wachten & Verifiëren
```
Wacht 10-30 minuten
Ga terug naar Domain Settings
Klik "Verifieer DNS"
```

### Stap 6: Live! 🎉
```
Status = VERIFIED ✅
SSL = ACTIVE 🔒
Website = LIVE! 🌐

Bezoek: https://ai-reisagent.online
```

---

## 🎨 Preview vs Live

### Preview URL (altijd beschikbaar):
```
https://preview.ai-websitestudio.nl/brand/[website-id]
```

### Live URL (na DNS setup):
```
https://ai-reisagent.online
```

---

## ⚠️ Veelgemaakte Fouten

### ❌ Fout 1: TXT Record Type
```
FOUT:  Type = A of CNAME
GOED:  Type = TXT
```

### ❌ Fout 2: TXT Value met Quotes
```
FOUT:  "abc123"
GOED:  abc123
```

### ❌ Fout 3: Hostname met www
```
FOUT:  www._bolt-verify
GOED:  _bolt-verify
```

### ❌ Fout 4: Verkeerd IP
```
FOUT:  127.0.0.1 of andere IP
GOED:  76.76.21.21
```

### ❌ Fout 5: CNAME Value met http://
```
FOUT:  http://cname.vercel-dns.com
GOED:  cname.vercel-dns.com
```

---

## 🔍 Debug Commands

### Check DNS propagatie:

**Online tools:**
- https://dnschecker.org
- https://www.whatsmydns.net
- https://mxtoolbox.com/SuperTool.aspx

**Command line:**
```bash
# Check A record
dig ai-reisagent.online A

# Check TXT record
dig _bolt-verify.ai-reisagent.online TXT

# Check CNAME record
dig www.ai-reisagent.online CNAME
```

### Verwachte output:

#### A Record:
```
ai-reisagent.online.  300  IN  A  76.76.21.21
```

#### TXT Record:
```
_bolt-verify.ai-reisagent.online.  300  IN  TXT  "abc123def456..."
```

#### CNAME Record:
```
www.ai-reisagent.online.  300  IN  CNAME  cname.vercel-dns.com.
```

---

## 📞 Support

### Als het niet lukt:

1. **Check de dashboard foutmelding** - staat er welke DNS record mist
2. **Screenshot je DNS settings** - deel met support
3. **Check DNS propagatie** - via dnschecker.org
4. **Wacht langer** - soms duurt DNS 24 uur (meestal 30 min)
5. **Clear DNS cache** lokaal: `ipconfig /flushdns` (Windows) of `sudo dscacheutil -flushcache` (Mac)

### Logboeken bekijken:

**Operator Dashboard → Monitoring → Edge Function Logs:**
- Filter op `verify-domain`
- Bekijk laatste verificatie pogingen
- Check error messages

---

## 🎯 Samenvatting

### De 3 cruciale dingen:

1. **Website met pagina's** moet bestaan in systeem
2. **DNS records** moeten exact kloppen met dashboard instructies
3. **Wacht op propagatie** (5-60 minuten)

### Success criteria:

✅ Dashboard toont "VERIFIED" status
✅ SSL certificaat is actief
✅ Website opent op https://ai-reisagent.online
✅ Alle pagina's zijn bereikbaar
✅ Menu werkt correct

---

**Veel succes met je website! 🚀**

Als je specifieke errors krijgt, deel dan de exacte foutmelding en we kunnen verder troubleshooten.
