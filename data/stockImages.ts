export interface StockImageItem {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const CATEGORY_STOCK_IMAGES: Record<string, string[]> = {
  Trekking: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=800&q=80',
  ],
  Camping: [
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80',
  ],
  Waterfall: [
    'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  ],
  Fort: [
    'https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
  ],
  Beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1471922694854-ff24a56926c3?auto=format&fit=crop&w=800&q=80',
  ],
  Pilgrimage: [
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=800&q=80',
  ],
};

export const DESTINATION_STOCK_IMAGES: Record<string, string> = {
  'Harishchandragad': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
  'Kokankada': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
  'Kalsubai': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'Adrai': 'https://images.unsplash.com/photo-1511497584788-876761465586?auto=format&fit=crop&w=800&q=80',
  'Ratangad': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  'Raigad': 'https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?auto=format&fit=crop&w=800&q=80',
  'Bhimashankar': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
  'Naneghat': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'Nanemachi': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
  'Devkund': 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
  'Kaas Pathar': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80',
  'Raireshwar': 'https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=800&q=80',
  'Dhakoba': 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=800&q=80',
};

export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=800&q=80';

export function getStockImageForTrip(title: string, category?: string): string {
  // 1. Try matching by specific title/place name
  for (const place of Object.keys(DESTINATION_STOCK_IMAGES)) {
    if (title.toLowerCase().includes(place.toLowerCase())) {
      return DESTINATION_STOCK_IMAGES[place];
    }
  }

  // 2. Try matching by category
  if (category && CATEGORY_STOCK_IMAGES[category]) {
    const list = CATEGORY_STOCK_IMAGES[category];
    return list[0];
  }

  return DEFAULT_FALLBACK_IMAGE;
}
