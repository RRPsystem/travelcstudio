import { useState } from 'react';
import { MapPin, Building2, Utensils, ShoppingBag, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { OfferteDestination, OfferteItem } from '../../types/offerte';

interface DayByDaySectionProps {
  destinations: OfferteDestination[];
  items: OfferteItem[];
  brandColor?: string;
  carImageUrl?: string;
}

// Fallback car SVG — top-down view pointing downward
function DefaultCarIcon() {
  return (
    <svg viewBox="0 0 24 40" width="28" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="28" rx="4" fill="#dc2626" />
      <rect x="5" y="8" width="14" height="8" rx="2" fill="#87CEEB" opacity="0.7" />
      <rect x="5" y="8" width="14" height="4" rx="1" fill="#a8d8ea" opacity="0.5" />
      <circle cx="7" cy="5" r="2.5" fill="#333" />
      <circle cx="17" cy="5" r="2.5" fill="#333" />
      <circle cx="7" cy="35" r="2.5" fill="#333" />
      <circle cx="17" cy="35" r="2.5" fill="#333" />
      <rect x="2" y="30" width="4" height="2" rx="1" fill="#ff6b6b" />
      <rect x="18" y="30" width="4" height="2" rx="1" fill="#ff6b6b" />
      <rect x="4" y="6" width="3" height="1.5" rx="0.5" fill="#ffd700" />
      <rect x="17" y="6" width="3" height="1.5" rx="0.5" fill="#ffd700" />
    </svg>
  );
}

// Photo slideshow with arrows + dots
function PhotoSlideshow({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full min-h-[450px] bg-gray-200 flex items-center justify-center">
        <MapPin size={48} className="text-gray-400" />
      </div>
    );
  }
  return (
    <div className="relative w-full h-full min-h-[450px] group overflow-hidden">
      <img
        src={images[current]}
        alt={`${name} - ${current + 1}`}
        className="w-full h-full object-cover absolute inset-0"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(c => c > 0 ? c - 1 : images.length - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent(c => c < images.length - 1 ? c + 1 : 0)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white scale-125 shadow' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Match hotels to destinations by name overlap
function matchHotelToDestination(dest: OfferteDestination, allHotels: OfferteItem[]): OfferteItem | null {
  const destName = (dest.name || '').toLowerCase();
  if (!destName) return null;
  for (const h of allHotels) {
    const hotelLoc = (h.location || h.hotel_name || h.title || '').toLowerCase();
    if (hotelLoc && (hotelLoc.includes(destName) || destName.includes(hotelLoc))) {
      return h;
    }
  }
  return null;
}

export function DayByDaySection({ destinations, items, brandColor = '#2e7d32', carImageUrl }: DayByDaySectionProps) {
  if (!destinations.length) return null;

  const hotels = items.filter(i => i.type === 'hotel');
  const numDest = destinations.length;

  return (
    <div className="w-full">
      {/* Section banner */}
      <div className="w-full py-10 text-center" style={{ backgroundColor: brandColor }}>
        <h2 className="text-2xl md:text-3xl text-white tracking-wide">
          DE REIS <span className="font-bold">DAG BIJ DAG</span>
        </h2>
        <p className="text-white/80 text-sm italic mt-2">Highlights Of Your Journey</p>
      </div>

      {/*
        CSS Grid: 3 columns [1fr  48px  1fr]
        The ROAD column (col 2) spans ALL rows → sticky car works inside it.
        Each destination occupies one row, alternating photo left/right.
      */}
      <div
        className="w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 48px 1fr',
          gridTemplateRows: `repeat(${numDest}, auto)`,
        }}
      >
        {/* === ROAD COLUMN — spans all rows === */}
        <div
          className="relative"
          style={{ gridColumn: 2, gridRow: `1 / ${numDest + 1}` }}
        >
          {/* Road surface */}
          <div className="absolute inset-0 bg-gray-500 z-0">
            <div
              className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2"
              style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, white 0px, white 14px, transparent 14px, transparent 28px)',
              }}
            />
          </div>
          {/* Sticky car — stays in viewport as you scroll */}
          <div className="sticky top-[45vh] z-30 flex items-center justify-center pointer-events-none">
            <div className="flex items-center justify-center" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
              {carImageUrl ? (
                <img src={carImageUrl} alt="auto" className="w-8 h-auto" />
              ) : (
                <DefaultCarIcon />
              )}
            </div>
          </div>
        </div>

        {/* === DESTINATION ROWS === */}
        {destinations.map((dest, idx) => {
          const isEven = idx % 2 === 0;
          const matchedHotel = matchHotelToDestination(dest, hotels) || hotels[idx] || null;
          const dayLabel = dest.order !== undefined ? dest.order + 1 : idx + 1;
          const row = idx + 1;

          // Photo cell and text cell swap columns based on even/odd
          const photoCol = isEven ? 1 : 3;
          const textCol = isEven ? 3 : 1;

          return [
            /* PHOTO CELL */
            <div
              key={`photo-${idx}`}
              style={{ gridColumn: photoCol, gridRow: row }}
              className="relative"
            >
              <PhotoSlideshow images={dest.images || []} name={dest.name} />
            </div>,

            /* STOP MARKER — overlays the road column */
            <div
              key={`stop-${idx}`}
              style={{ gridColumn: 2, gridRow: row }}
              className="relative z-20 flex items-start justify-center pt-8"
            >
              <div
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                <span className="text-white text-xs font-bold leading-tight text-center">
                  Stop<br />{idx + 1}
                </span>
              </div>
            </div>,

            /* TEXT CELL */
            <div
              key={`text-${idx}`}
              style={{ gridColumn: textCol, gridRow: row }}
              className="flex flex-col bg-white"
            >
              <div className="flex-1 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Dag {dayLabel}: {dest.name}
                </h3>
                {dest.country && (
                  <p className="text-sm text-gray-400 italic mb-4">{dest.country}</p>
                )}
                {dest.description && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">{dest.description}</p>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {(dest.highlights && dest.highlights.length > 0
                    ? dest.highlights.slice(0, 4).map((h, i) => ({
                        title: h,
                        sub: ['Bezienswaardigheden','Lokale producten','Lokale gerechten','Activiteiten'][i % 4],
                      }))
                    : [
                        { title: 'Tourist Attraction:', sub: 'Bezienswaardigheden' },
                        { title: 'Best Buy:', sub: 'Lokale producten' },
                        { title: 'Food Speciality:', sub: 'Lokale gerechten' },
                        { title: 'Activity:', sub: 'Activiteiten' },
                      ]
                  ).map((item, i) => {
                    const icons = [MapPin, ShoppingBag, Utensils, Compass];
                    const Icon = icons[i % icons.length];
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <Icon size={16} style={{ color: brandColor }} className="mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{item.title}</div>
                          <div className="text-[10px] text-gray-400">{item.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hotel bar */}
              {matchedHotel && (
                <div className="px-6 py-3 flex items-center gap-3 text-white text-sm" style={{ backgroundColor: brandColor }}>
                  <Building2 size={16} className="shrink-0" />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider opacity-70 font-bold">HOTEL</span>
                    <span className="font-medium">{matchedHotel.title || matchedHotel.hotel_name}</span>
                    {matchedHotel.location && (
                      <span className="opacity-70 text-xs">
                        , {typeof matchedHotel.location === 'object' ? (matchedHotel.location as any).name : matchedHotel.location}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>,
          ];
        })}
      </div>
    </div>
  );
}
