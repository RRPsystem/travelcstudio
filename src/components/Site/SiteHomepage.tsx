import { useState } from 'react';
import {
  Search, ArrowRight, Play, Phone, Mail, MapPin,
  Clock, Users, Star, Globe, Shield, ChevronRight,
  Facebook, Instagram, Youtube, Building2,
  Ship, Sun, Mountain, Heart, Umbrella
} from 'lucide-react';

interface BrandData {
  id: string;
  name: string;
  logo_url: string;
  primary_color: string;
  tagline?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  website_url?: string;
}

interface SiteHomepageProps {
  brand: BrandData;
  primaryColor: string;
  destinations: any[];
  travels: any[];
  agents: any[];
  newsItems: any[];
}

// Travel type cards with icons as fallback
const TRAVEL_TYPES = [
  { label: 'Zonvakanties', icon: Sun, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
  { label: 'Stedentrips', icon: Building2, image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop' },
  { label: 'Rondreizen', icon: Globe, image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop' },
  { label: 'Huwelijksreizen', icon: Heart, image: 'https://images.unsplash.com/photo-1439130490301-25e322d88054?w=400&h=300&fit=crop' },
  { label: 'Luxe Vakanties', icon: Star, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop' },
  { label: 'Wintersport', icon: Mountain, image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&h=300&fit=crop' },
  { label: 'Cruises', icon: Ship, image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=300&fit=crop' },
  { label: 'All Inclusive', icon: Umbrella, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop' },
];

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080&fit=crop',
];

export function SiteHomepage({ brand, primaryColor, destinations, travels, agents, newsItems }: SiteHomepageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Generate CSS custom properties for brand color
  const brandStyle = {
    '--brand-color': primaryColor,
    '--brand-color-dark': adjustColor(primaryColor, -20),
    '--brand-color-light': adjustColor(primaryColor, 40),
  } as React.CSSProperties;

  const navItems = [
    { label: 'Reizen', href: '#reizen' },
    { label: 'Reisadviseurs', href: '#adviseurs' },
    { label: 'Wordt reisadviseur', href: '#werving' },
    { label: 'Over Ons', href: '#over-ons' },
    { label: 'Contact', href: '#contact' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-white" style={brandStyle}>
      {/* ===== NAVIGATION ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="h-10 md:h-12 w-auto object-contain brightness-0 invert" />
              ) : (
                <span className="text-xl font-bold text-white">{brand.name}</span>
              )}
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* CTA Button */}
            <div className="flex items-center space-x-3">
              <button
                className="hidden md:flex items-center px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                Plan Je Reis
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white rounded-lg hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-black/80 backdrop-blur-lg border-t border-white/10">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-3 py-2.5 text-white/90 hover:text-white rounded-lg hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <button
                className="w-full mt-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Plan Je Reis
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGES[0]})` }}
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${primaryColor}90 0%, ${primaryColor}50 40%, ${primaryColor}70 100%)` }} />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight" style={{ fontStyle: 'italic' }}>
            Jouw Droomreis{'\n'}Wacht Op Je
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            {brand.tagline || `Persoonlijke reisadviseurs sinds 1999. Ontdek de wereld met onze ervaren reisadviseurs. Meer dan ${agents.length > 0 ? agents.length * 10 : 200} specialisten staan klaar om jouw perfecte reis samen te stellen.`}
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-full shadow-2xl overflow-hidden pl-5 pr-2 py-2">
              <Search size={20} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Waar wil je naartoe? (bijv. Japan, Bali, Italië...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-gray-700 bg-transparent outline-none text-sm md:text-base"
              />
              <button
                className="px-6 py-2.5 rounded-full text-white font-semibold text-sm transition-all hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                Zoeken
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#adviseurs"
              className="flex items-center gap-2 px-8 py-3.5 bg-white/95 backdrop-blur-sm rounded-full font-semibold transition-all hover:scale-105 hover:bg-white shadow-lg"
              style={{ color: primaryColor }}
            >
              Vind Jouw Reisadviseur
              <ArrowRight size={18} />
            </a>
            <button className="flex items-center gap-2 px-8 py-3.5 border-2 border-white/80 text-white rounded-full font-semibold transition-all hover:bg-white/10 hover:scale-105">
              <Play size={18} />
              Bekijk Video
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ===== SOORTEN REIZEN ===== */}
      <section className="py-20 px-4 bg-gray-50" id="reizen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: primaryColor }}>
              Soorten Reizen
            </h2>
            <p className="text-gray-600 text-lg">Kies jouw perfecte reistype</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {TRAVEL_TYPES.map((type) => (
              <a
                key={type.label}
                href="#"
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <img
                  src={type.image}
                  alt={type.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-sm md:text-base">{type.label}</h3>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WERVING BANNER ===== */}
      <section className="py-16 px-4" style={{ backgroundColor: primaryColor }} id="werving">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Zelfstandig reisondernemer worden?
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Sluit je aan bij ons netwerk van meer dan {agents.length > 0 ? agents.length * 5 : 370} succesvolle reisondernemers en start jouw eigen reisbusiness.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#info"
              className="flex items-center gap-2 px-8 py-3.5 bg-white rounded-full font-semibold transition-all hover:scale-105 shadow-lg"
              style={{ color: primaryColor }}
            >
              Meer Informatie
              <ArrowRight size={18} />
            </a>
            <a
              href="#sollicitatie"
              className="flex items-center gap-2 px-8 py-3.5 border-2 border-white text-white rounded-full font-semibold transition-all hover:bg-white/10 hover:scale-105"
            >
              <Phone size={18} />
              Bel voor advies
            </a>
          </div>
        </div>
      </section>

      {/* ===== POPULAIRE REIZEN ===== */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Ontdek Onze Populaire Reizen
            </h2>
            <p className="text-gray-600 text-lg">
              Van Europese steden tot exotische stranden — wij brengen u naar de mooiste plekken ter wereld
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(travels.length > 0 ? travels.slice(0, 6) : PLACEHOLDER_TRAVELS).map((travel, idx) => (
              <TravelCard key={travel.id || idx} travel={travel} primaryColor={primaryColor} />
            ))}
          </div>

          {travels.length > 6 && (
            <div className="text-center mt-10">
              <a
                href="#alle-reizen"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                Bekijk Alle Reizen
                <ArrowRight size={18} />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ===== OVER ONS / REISADVISEURS ===== */}
      <section className="py-20 px-4 bg-gray-50" id="over-ons">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>
                Welkom bij {brand.name}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {brand.name}<br />
                <span style={{ color: primaryColor }}>Persoonlijke reisondernemers</span>
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {brand.description || `${brand.name} is een keten met meer dan ${agents.length > 0 ? agents.length * 5 : 270} aangesloten ervaren reisondernemers in Nederland. Neem contact op met onze persoonlijke reisondernemers voor deskundig, betrouwbaar en objectief reisadvies.`}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Users, label: 'Persoonlijke Service' },
                  { icon: Globe, label: 'Exper Tips & Routes' },
                  { icon: MapPin, label: 'Lokaal & Bereikbaar' },
                  { icon: Shield, label: 'Betrouwbaar & Veilig' },
                  { icon: Star, label: 'Snelle Service' },
                  { icon: Clock, label: 'Wereldwijd Netwerk' },
                ].map((feat) => (
                  <div key={feat.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                      <feat.icon size={16} style={{ color: primaryColor }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{feat.label}</span>
                  </div>
                ))}
              </div>

              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm rounded-full font-semibold transition-all hover:scale-105 border-2"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Op afspraak komen wij bij u thuis, op uw kantoor of andere gewenste locatie.
              </a>
            </div>

            {/* Image */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop"
                  alt="Reisadviseur"
                  className="w-full h-[400px] lg:h-[500px] object-cover"
                />
              </div>
              {/* Floating stats card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <Globe size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{destinations.length > 0 ? destinations.length : '150'}+</p>
                  <p className="text-sm text-gray-500">Bestemmingen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== REISADVISEURS GRID ===== */}
      {agents.length > 0 && (
        <section className="py-20 px-4 bg-white" id="adviseurs">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Onze Reisadviseurs
              </h2>
              <p className="text-gray-600 text-lg">
                Persoonlijk advies van ervaren reisprofessionals
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {agents.slice(0, 8).map((agent) => (
                <a
                  key={agent.id}
                  href={`#adviseur/${agent.id}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {agent.photo_url ? (
                      <img
                        src={agent.photo_url}
                        alt={agent.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10` }}>
                        <Users size={48} style={{ color: primaryColor }} className="opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-bold text-gray-900">{agent.name}</h3>
                    {agent.province && (
                      <p className="text-sm text-gray-500 mt-1">{agent.province}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>

            {agents.length > 8 && (
              <div className="text-center mt-10">
                <a
                  href="#alle-adviseurs"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Bekijk Alle Reisadviseurs
                  <ArrowRight size={18} />
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== FINAL CTA ===== */}
      <section
        className="py-20 px-4 text-center"
        style={{ backgroundColor: primaryColor.replace(')', ', 0.05)').replace('rgb', 'rgba') }}
      >
        <div className="max-w-3xl mx-auto" style={{ backgroundColor: `${primaryColor}08` }}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Klaar Voor Jouw Volgende Avontuur?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Neem contact op met een van onze reisadviseurs en start het plannen van jouw droomreis vandaag nog.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#adviseurs"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              Bekijk Alle Reisadviseurs
              <ArrowRight size={18} />
            </a>
            <a
              href={`tel:${brand.phone || ''}`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold border-2 transition-all hover:scale-105"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Phone size={18} />
              Bel Direct {brand.phone || ''}
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400 pt-16 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand info */}
            <div>
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="h-10 w-auto object-contain brightness-0 invert mb-4" />
              ) : (
                <h3 className="text-xl font-bold text-white mb-4">{brand.name}</h3>
              )}
              <p className="text-sm leading-relaxed mb-4">
                Jouw partner voor onvergetelijke reizen sinds 1999. Ontdek de wereld met onze ervaren reisexperts.
              </p>
              <div className="flex gap-3">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:text-white"
                    style={{ backgroundColor: `${primaryColor}30` }}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                {['Over Ons', 'Contact', 'Reizen', 'Bestemmingen', 'Roadmap'].map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                      <ChevronRight size={14} />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Service */}
            <div>
              <h4 className="text-white font-semibold mb-4">Service</h4>
              <ul className="space-y-2.5 text-sm">
                {['Veelgestelde Vragen', 'Reisverzekeringen', 'Reisvoorwaarden', 'Privacy'].map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                      <ChevronRight size={14} />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                {brand.phone && (
                  <li className="flex items-center gap-3">
                    <Phone size={16} style={{ color: primaryColor }} />
                    <a href={`tel:${brand.phone}`} className="hover:text-white transition-colors">{brand.phone}</a>
                  </li>
                )}
                {brand.email && (
                  <li className="flex items-center gap-3">
                    <Mail size={16} style={{ color: primaryColor }} />
                    <a href={`mailto:${brand.email}`} className="hover:text-white transition-colors">{brand.email}</a>
                  </li>
                )}
                {brand.address && (
                  <li className="flex items-start gap-3">
                    <MapPin size={16} style={{ color: primaryColor }} className="flex-shrink-0 mt-0.5" />
                    <span>{brand.address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between text-sm">
            <p>&copy; {new Date().getFullYear()} {brand.name}. Alle rechten voorbehouden.</p>
            <p className="mt-2 md:mt-0 text-gray-500">
              Powered by <span className="font-semibold" style={{ color: primaryColor }}>TravelC Studio</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===== TRAVEL CARD COMPONENT =====
function TravelCard({ travel, primaryColor }: { travel: any; primaryColor: string }) {
  const image = travel.hero_image || travel.image_url || travel.photos?.[0] || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop';
  const title = travel.name || travel.title || 'Reis';
  const destination = travel.destination_name || travel.country || '';
  const duration = travel.duration || travel.nights ? `${travel.duration || travel.nights} dagen` : '';
  const price = travel.price_from || travel.price;
  const tags = travel.tags || travel.categories || [];

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {destination && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full text-white" style={{ backgroundColor: `${primaryColor}CC` }}>
              {destination}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{title}</h3>

        {/* Tags */}
        {Array.isArray(tags) && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 4).map((tag: string, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full font-medium"
                style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{duration}</span>
            </div>
          )}
          {price && (
            <div className="font-bold text-gray-900">
              P.p {typeof price === 'number' ? `€ ${price.toLocaleString('nl-NL')}` : price}
            </div>
          )}
        </div>

        <a
          href={`#reis/${travel.id}`}
          className="block w-full py-2.5 text-center rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Ontdek Meer →
        </a>
      </div>
    </div>
  );
}

// ===== HELPERS =====
function adjustColor(hex: string, amount: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, n));
  const h = hex.replace('#', '');
  const r = clamp(parseInt(h.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(h.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ===== PLACEHOLDER DATA =====
const PLACEHOLDER_TRAVELS = [
  {
    id: 'p1',
    name: 'Spanje Rondreis',
    destination_name: 'Spanje',
    hero_image: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=600&h=400&fit=crop',
    duration: '14 dagen',
    price_from: 1299,
    tags: ['Rondreis', 'Cultuur', 'Strand'],
  },
  {
    id: 'p2',
    name: 'Azië Avontuur',
    destination_name: 'Thailand',
    hero_image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop',
    duration: '11 dagen',
    price_from: 1599,
    tags: ['Avontuur', 'Natuur', 'Tempel'],
  },
  {
    id: 'p3',
    name: 'Amerika Westkust',
    destination_name: 'USA',
    hero_image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&h=400&fit=crop',
    duration: '16 dagen',
    price_from: 2199,
    tags: ['Roadtrip', 'Natuur', 'Stedentrip'],
  },
];
