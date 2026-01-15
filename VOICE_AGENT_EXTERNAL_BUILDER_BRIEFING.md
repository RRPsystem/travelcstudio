# 🎙️ TravelAgent Voice - External Builder Integration Briefing

## Executive Summary

We're building a **voice-first mobile app** that allows travel agents to create professional travel offers while on the go - in their car, at client meetings, or anywhere - using only their voice. Think "ChatGPT Voice" but specifically for travel offer creation.

**Our ask:** You build the backend system that transforms structured offer data into beautiful, professional offer pages with hotels, flights, videos, and pricing.

---

## The Problem We're Solving

### Current Situation (Pain Points)
- ❌ Travel agents spend **45+ minutes** per offer (typing, searching, formatting)
- ❌ Agents can't work efficiently while **driving between client meetings**
- ❌ Creating offers requires a **laptop/desktop** setup
- ❌ Lost opportunities because agents can't respond quickly
- ❌ Manual work = errors and inconsistent quality

### Our Solution
- ✅ Agents **speak** their offer requirements (hands-free)
- ✅ AI asks clarifying questions via voice
- ✅ Professional offer ready in **2-3 minutes**
- ✅ Works anywhere: car, train, client's home
- ✅ **3x more offers per day** = 3x more revenue

---

## User Journey Example

```
🚗 AGENT IN CAR (10:30 AM)
├─ Agent: "Hey TravelAgent, create an offer for the Jansen family"
│
├─ AI: "Sure! Tell me about their trip"
│
├─ Agent: "Las Vegas, June 15-22, 2 adults, they want 4-star hotels
│          with pool and casino, show 3 options, budget max 3500
│          per person, use template A"
│
├─ AI: "Perfect! Departure from Amsterdam? Any airline preference?"
│
├─ Agent: "Amsterdam yes, no airline preference"
│
├─ AI: "Great! I'm creating the offer now. You'll get a notification
│       when it's ready"
│
└─ 📱 NOTIFICATION (10:33 AM): "Offer ready! Share with client"

👨‍👩‍👧 AT CLIENT'S HOME (10:45 AM)
└─ Agent shows polished offer on tablet
   Client impressed, selects MGM Grand option
   Booking confirmed on the spot ✅
```

**Time saved:** 42 minutes | **Client experience:** 10/10 | **Conversion:** Instant

---

## What We Need From You

### Core Functionality

You build a system that:

1. **Receives structured offer requests** (via API)
2. **Searches & selects** hotels, flights, activities (your existing Travel Compositor)
3. **Generates beautiful offer pages** with:
   - 3-4 hotel options with images & videos
   - Flight options & pricing
   - Destination videos (YouTube integration)
   - Professional branded template
   - Mobile-responsive design
4. **Returns the offer URL** via webhook
5. **Hosts the offer pages** on our custom domains

### Speed Requirement
- ⏱️ **Maximum 3 minutes** from API call to ready offer
- Real-time status updates via webhook
- Graceful degradation if APIs are slow

---

## Technical Integration Spec

### 1. Offer Creation API

**Endpoint:** `POST https://your-api.com/v1/offers/create`

**Authentication:**
```http
Authorization: Bearer {api_key}
X-Brand-ID: {brand_uuid}
```

**Request Body:**
```json
{
  "brand_id": "uuid-of-travel-agency",
  "agent": {
    "id": "agent-uuid",
    "name": "Sandra van der Berg",
    "email": "sandra@reisburo.nl",
    "phone": "+31612345678"
  },

  "customer": {
    "name": "Familie Jansen",
    "reference": "JANS-2025-001",
    "email": "jansen@email.com",
    "phone": "+31687654321"
  },

  "trip": {
    "destination": {
      "city": "Las Vegas",
      "country": "USA",
      "region": "Nevada"
    },
    "dates": {
      "checkin": "2025-06-15",
      "checkout": "2025-06-22",
      "flexible_days": 2
    },
    "travelers": {
      "adults": 2,
      "children": 0,
      "infants": 0
    },
    "departure_airport": "AMS"
  },

  "preferences": {
    "accommodation": {
      "type": "hotel",
      "stars_min": 4,
      "stars_max": 5,
      "required_amenities": ["pool", "casino"],
      "location": "Strip",
      "room_type": "double"
    },
    "budget": {
      "max_per_person": 3500,
      "currency": "EUR",
      "includes": ["flights", "accommodation"]
    },
    "special_requests": "Window view preferred, non-smoking"
  },

  "output_config": {
    "template_id": "A",
    "hotel_options": 3,
    "include_flights": true,
    "include_activities": false,
    "include_videos": true,
    "language": "nl"
  },

  "notification": {
    "webhook_url": "https://our-platform.com/webhooks/offer-ready",
    "send_to_agent": {
      "whatsapp": true,
      "email": true,
      "push": true
    }
  }
}
```

**Immediate Response (202 Accepted):**
```json
{
  "job_id": "job-abc123xyz",
  "status": "processing",
  "estimated_time_seconds": 120,
  "status_url": "https://your-api.com/v1/offers/status/job-abc123xyz"
}
```

---

### 2. Status Updates (Optional)

**Endpoint:** `GET https://your-api.com/v1/offers/status/{job_id}`

**Response:**
```json
{
  "job_id": "job-abc123xyz",
  "status": "processing",
  "progress": {
    "step": "searching_hotels",
    "percentage": 45,
    "message": "Comparing hotel options..."
  },
  "estimated_completion": "2025-01-15T10:33:00Z"
}
```

**Status values:**
- `processing` - Still working
- `completed` - Offer ready
- `failed` - Something went wrong
- `partial` - Some data missing but offer created

---

### 3. Completion Webhook

**Our webhook URL:** `https://our-platform.com/webhooks/offer-ready`

**You call us with:**
```json
{
  "job_id": "job-abc123xyz",
  "status": "completed",
  "offer": {
    "id": "offer-789xyz",
    "url": "https://reisburo-jansen.nl/offerte/offer-789xyz",
    "short_url": "https://rbj.nl/o/abc123",
    "qr_code": "https://your-cdn.com/qr/offer-789xyz.png",

    "summary": {
      "destination": "Las Vegas, USA",
      "dates": "15-22 June 2025",
      "travelers": 2,
      "total_price_from": 2650,
      "total_price_to": 3100,
      "currency": "EUR"
    },

    "options": [
      {
        "id": "option-1",
        "hotel": {
          "name": "MGM Grand",
          "stars": 4,
          "address": "3799 Las Vegas Blvd S, Las Vegas, NV",
          "description": "Iconic hotel with world-class casino...",
          "image": "https://your-cdn.com/hotels/mgm-grand-main.jpg",
          "images": [
            "https://your-cdn.com/hotels/mgm-grand-1.jpg",
            "https://your-cdn.com/hotels/mgm-grand-2.jpg"
          ],
          "video": "https://youtube.com/watch?v=xyz",
          "amenities": ["pool", "casino", "spa", "restaurants"],
          "rating": 4.2,
          "reviews": 15234
        },
        "room": {
          "type": "Grand King Room",
          "size_sqm": 42,
          "bed": "King size",
          "view": "City view"
        },
        "pricing": {
          "accommodation": {
            "total": 1800,
            "per_night": 257,
            "currency": "EUR"
          },
          "flights": {
            "total": 850,
            "per_person": 425,
            "currency": "EUR"
          },
          "total": 2650,
          "currency": "EUR"
        }
      },
      {
        "id": "option-2",
        "hotel": {
          "name": "Bellagio Hotel & Casino",
          "stars": 4.5,
          ...
        },
        "pricing": {
          "total": 2890,
          ...
        }
      },
      {
        "id": "option-3",
        "hotel": {
          "name": "Caesars Palace",
          "stars": 4.5,
          ...
        },
        "pricing": {
          "total": 3100,
          ...
        }
      }
    ],

    "flights": {
      "outbound": {
        "airline": "KLM",
        "flight_number": "KL651",
        "departure": "2025-06-15T10:30:00+02:00",
        "arrival": "2025-06-15T13:45:00-07:00",
        "duration": "11h 15m",
        "stops": 0
      },
      "return": {
        "airline": "KLM",
        "flight_number": "KL652",
        "departure": "2025-06-22T15:00:00-07:00",
        "arrival": "2025-06-23T10:15:00+02:00",
        "duration": "10h 15m",
        "stops": 0
      }
    },

    "destination_content": {
      "video": "https://youtube.com/watch?v=vegas-intro",
      "description": "Las Vegas, the Entertainment Capital...",
      "highlights": [
        "World-famous casinos",
        "Spectacular shows",
        "Gourmet dining"
      ]
    },

    "metadata": {
      "created_at": "2025-01-15T10:33:22Z",
      "valid_until": "2025-01-22T10:33:22Z",
      "template": "A",
      "language": "nl"
    }
  }
}
```

---

### 4. Error Handling

**If something goes wrong:**
```json
{
  "job_id": "job-abc123xyz",
  "status": "failed",
  "error": {
    "code": "NO_AVAILABILITY",
    "message": "No hotels found matching criteria",
    "details": "No 4-star hotels available in Las Vegas for June 15-22",
    "suggestions": [
      "Try flexible dates (+/- 2 days)",
      "Consider 3-star hotels",
      "Try different location (Downtown vs Strip)"
    ]
  }
}
```

**Partial success:**
```json
{
  "job_id": "job-abc123xyz",
  "status": "partial",
  "offer": {
    ...
  },
  "warnings": [
    "Only 2 hotels found instead of requested 3",
    "Video unavailable for Bellagio",
    "Flight prices may have changed"
  ]
}
```

---

## Offer Page Requirements

### Must-Have Features

1. **Mobile-First Design**
   - Responsive on all devices
   - Fast loading (< 2 seconds)
   - Touch-friendly buttons

2. **Visual Appeal**
   - High-quality hotel images
   - Destination videos (embedded YouTube)
   - Professional typography
   - Brand colors & logo

3. **Clear Pricing**
   - Total price prominent
   - Price breakdown (hotel + flights)
   - "From €X per person" messaging
   - Tax/fees transparency

4. **Easy Comparison**
   - Side-by-side hotel comparison (desktop)
   - Swipeable cards (mobile)
   - Filter by price, stars, amenities
   - Sort options

5. **Call-to-Action**
   - "Select this option" button per hotel
   - "Contact agent" button (WhatsApp/phone)
   - "Request changes" button
   - Share button (WhatsApp, email)

6. **Trust Signals**
   - Hotel ratings & reviews
   - Agent photo & contact
   - Agency branding & certifications
   - "Price valid until X" countdown

### Nice-to-Have Features

- Interactive map showing hotel locations
- 360° hotel room tours
- Weather forecast for travel dates
- Local activities & excursions
- Travel insurance options
- Payment plan calculator
- Customer reviews integration

---

## Templates

We need at least **3 template styles**:

### Template A: "Luxe"
- Full-width hero images
- Video backgrounds
- Elegant serif fonts
- Spacious layout

### Template B: "Modern"
- Clean, minimal design
- Sans-serif fonts
- Card-based layout
- Bold colors

### Template C: "Classic"
- Traditional travel brochure style
- Photo galleries
- Detailed descriptions
- Print-friendly

**Each template should:**
- Support brand customization (colors, logo, fonts)
- Work on mobile, tablet, desktop
- Have consistent information architecture
- Load in < 2 seconds

---

## Brand Customization

Each travel agency has their own branding:

```json
{
  "brand": {
    "id": "brand-uuid",
    "name": "Reisburo Jansen",
    "logo": "https://...",
    "colors": {
      "primary": "#003366",
      "secondary": "#FFD700",
      "accent": "#FF6B6B"
    },
    "fonts": {
      "heading": "Playfair Display",
      "body": "Open Sans"
    },
    "contact": {
      "phone": "+31201234567",
      "whatsapp": "+31612345678",
      "email": "info@reisburo-jansen.nl",
      "address": "Hoofdstraat 123, 1234 AB Amsterdam"
    },
    "certifications": [
      "SGR lid",
      "ANVR erkend",
      "Calamiteitenfonds"
    ]
  }
}
```

---

## Performance Requirements

### Speed Targets
- ⏱️ **API response:** < 500ms (202 Accepted)
- ⏱️ **Offer creation:** < 3 minutes (95th percentile)
- ⏱️ **Page load:** < 2 seconds
- ⏱️ **Image load:** Progressive (show low-res first)

### Scalability
- **Concurrent jobs:** Support 100+ simultaneous offers
- **Peak capacity:** 1000 offers per hour
- **Uptime:** 99.5% SLA minimum

### Rate Limiting
- **Reasonable limits** per brand/agent
- Clear error messages when limits hit
- Upgrade paths for high-volume agencies

---

## Business Model Discussion

We're flexible on pricing structure. Some options:

### Option 1: Per-Offer Pricing
- €2.00 - €3.00 per completed offer
- Only charged when offer successfully created
- Simple, predictable for clients

### Option 2: Subscription
- €299/month per brand (unlimited offers)
- €99/month per additional agent seat
- Predictable revenue for you

### Option 3: Hybrid
- €99/month base + €0.50 per offer
- Best of both worlds
- Scales with usage

### Option 4: Revenue Share
- Free integration
- 2-5% commission on bookings made via offers
- Aligned incentives

**What works best for your business model?**

---

## Timeline Expectations

### Phase 1: MVP (4-6 weeks)
- Basic API integration
- Template A working
- Hotel + flight search
- YouTube video integration
- Basic webhook notifications

### Phase 2: Enhancement (2-3 weeks)
- Templates B & C
- Advanced filtering
- Better error handling
- Performance optimization

### Phase 3: Scale (ongoing)
- Additional features
- More data sources
- Advanced analytics
- A/B testing

---

## Success Metrics

We'll measure success by:

1. **Speed:** Average time from API call to offer ready
2. **Quality:** Offer acceptance rate by clients
3. **Reliability:** Uptime & successful completion rate
4. **Satisfaction:** Agent NPS score
5. **Revenue:** Bookings generated from offers

**Target:** 70% of offers should result in bookings within 7 days

---

## Questions for You

### Technical
1. Can you achieve < 3 minute offer creation?
2. What's your uptime track record?
3. How do you handle API failures (hotels, flights)?
4. Can you scale to 1000+ offers/hour?
5. Do you have a staging environment for testing?

### Business
1. What pricing model do you prefer?
2. What's your preferred contract length?
3. Do you offer white-label solutions?
4. What support do you provide (SLA)?
5. Can we customize templates?

### Integration
1. How long does integration typically take?
2. Do you provide API documentation & SDKs?
3. What's your webhook reliability?
4. Do you support custom domains?
5. Can we test with sandbox/demo mode?

---

## Why This Partnership Makes Sense

### For You (External Builder)
✅ **Recurring revenue** from every active agency
✅ **Scalable model** - more agents = more volume
✅ **Sticky integration** - core to their workflow
✅ **Market expansion** - we bring you clients
✅ **Innovation showcase** - voice-first is cutting edge

### For Us (Platform)
✅ **Focus on core value** - voice interface & UX
✅ **Faster time to market** - leverage your expertise
✅ **Better quality** - you're the specialists
✅ **Scalability** - your infrastructure
✅ **Cost efficiency** - pay per use

---

## Next Steps

1. **Review this brief** - Any questions or clarifications?
2. **Technical call** - Walk through API specs together
3. **Proof of concept** - Create 1 sample offer end-to-end
4. **Pricing proposal** - Your recommended model
5. **Timeline & milestones** - Agree on delivery schedule
6. **Contract** - Sign partnership agreement
7. **Launch** - Start with 3-5 beta agencies

---

## Contact

**Project Lead:** [Your Name]
**Email:** [Your Email]
**Phone:** [Your Phone]
**Company:** TravelAgent Voice Platform

**Let's build something amazing together! 🚀**

---

## Appendix: Sample Offers

### Sample 1: Las Vegas
- **Destination:** Las Vegas, USA
- **Dates:** 15-22 June 2025 (7 nights)
- **Travelers:** 2 adults
- **Budget:** €3500/person
- **Hotels:** MGM Grand, Bellagio, Caesars Palace
- **Template:** A (Luxe)

### Sample 2: Bali
- **Destination:** Bali, Indonesia
- **Dates:** 1-14 August 2025 (13 nights)
- **Travelers:** 2 adults + 1 child (8 years)
- **Budget:** €2000/person
- **Hotels:** 3 beachfront resorts
- **Template:** B (Modern)

### Sample 3: Paris
- **Destination:** Paris, France
- **Dates:** 10-13 February 2025 (3 nights)
- **Travelers:** 2 adults
- **Budget:** €800/person
- **Hotels:** 3 boutique hotels
- **Template:** C (Classic)

**Can you create mockups for these 3 scenarios?**
