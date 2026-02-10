import { Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote } from 'lucide-react';
import { OfferteItemType, OFFERTE_ITEM_TYPES } from '../../types/offerte';

const iconMap: Record<string, React.ComponentType<any>> = {
  Plane, Car, Building2, Compass, CarFront, Ship, Train, Shield, StickyNote,
};

interface Props {
  onSelect: (type: OfferteItemType) => void;
  onClose: () => void;
}

export function OfferteItemTypeSelector({ onSelect, onClose }: Props) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-30 mt-2">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 min-w-[340px]">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Voeg toe</p>
        <div className="grid grid-cols-3 gap-2">
          {OFFERTE_ITEM_TYPES.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.type}
                onClick={() => {
                  onSelect(item.type);
                  onClose();
                }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.bgColor }}
                >
                  {Icon && <Icon size={20} style={{ color: item.color }} />}
                </div>
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
