export interface TripBatch {
  id: string;
  dateDuration: string;
  totalSeats: number;
  bookedSeats: number;
}

export interface TripPackage {
  name: string;
  price: number;
}

export interface TripAddon {
  name: string;
  price: number;
}

export interface PickupPoint {
  location: string;
  time: string;
  mapLink?: string;
  latitude?: number;
  longitude?: number;
}

export interface CrewDetails {
  captainName: string;
  captainPhone: string;
  driverName: string;
  vehicleNumber: string;
  vehiclePhoto: string;
}

export interface LiveLocation {
  latitude: number;
  longitude: number;
  updatedAt: number;
}

export interface GuestTraveller {
  id: string;
  name: string;
  location: LiveLocation;
}

export interface Rating {
  guestName: string;
  stars: number; // 1-5
  comment?: string;
  createdAt: number;
}

export interface Booking {
  id: string;
  tripId: string;
  batchId: string;
  packageName: string;
  travelerName: string;
  travelerPhone: string;
  travelerEmail?: string;
  totalPrice: number;
  addOns: string[];
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  createdAt: number;
  vendorId?: string;
  bookingId?: string;
  seats?: number;
}

export interface Trip {
  id: string;
  vendorId?: string;
  vendorName: string;
  vendorWhatsApp: string;
  vendorUPI: string[]; // Support multiple UPIs
  title: string;
  description: string;
  
  // New Fields
  batches: TripBatch[];
  packages: TripPackage[];
  addOns: TripAddon[];
  pickupPoints: PickupPoint[];
  
  itinerary: string;
  inclusions: string[];
  exclusions: string[];
  thingsToCarry: string[];
  cancellationPolicy: string[];
  
  images: string[];
  status: 'draft' | 'published';
  tripStatus?: 'pending' | 'started' | 'completed';
  crewDetails?: CrewDetails;
  ratings?: Rating[];
}

export const trips: Trip[] = [
  {
    id: '1',
    vendorName: 'Sahyadrikar community',
    vendorWhatsApp: '+919767962503',
    vendorUPI: ['Sachin Pawar 8830898253', 'Priti lipane 7666821338'],
    title: 'Rajmachi Camping & Fire flies special',
    description: 'The Fireflies Festival 2026 (locally known as Kajwa Mahotsav) is a magical seasonal event in Maharashtra... millions of fireflies illuminate the forests of the Western Ghats to attract mates.',
    batches: [
      { id: 'b1', dateDuration: '22-23 May 2026', totalSeats: 30, bookedSeats: 19 },
      { id: 'b2', dateDuration: '23-24 May 2026', totalSeats: 30, bookedSeats: 15 },
      { id: 'b3', dateDuration: '29-30 May 2026', totalSeats: 30, bookedSeats: 5 }
    ],
    packages: [
      { name: 'Pune (With Transport)', price: 1499 },
      { name: 'Without Transport', price: 999 }
    ],
    addOns: [
      { name: 'Couple tent extra', price: 200 },
      { name: 'Nonveg lunch Extra', price: 100 }
    ],
    pickupPoints: [
      { location: 'Shivajinagar', time: '08:00 PM', mapLink: 'https://maps.app.goo.gl/YxNSq8yNUh9G37Eo9' },
      { location: 'Nashik Phata', time: '08:30 PM', mapLink: 'https://maps.app.goo.gl/AWHB3As2Vo4FUo81A' },
      { location: 'Bhosari', time: '09:20 PM', mapLink: 'https://maps.app.goo.gl/rW4VLVD6DLt6tEMU8' },
      { location: 'Moshi', time: '09:30 PM', mapLink: 'https://maps.app.goo.gl/8HCRZ61pkA6VXHy39' }
    ],
    itinerary: 'Day 1 - Departure from Pune\n10:30 PM: Arrive at base village\n11:00 PM: Games & Fun\n12:30 AM: Midnight Jungle Hike for Fireflies\n02:00 AM: Rest in Tent\n06:30 AM: Rajmachi Sunrises\n01:00 PM: Return Journey',
    inclusions: [
      'Transport To & Fro From Pune',
      'Breakfast + Tea (1x)',
      'lunch (1x)',
      'Tent stay',
      'Bonefire',
      'Trek leader expertise',
      'Forest Department entry charges',
      'Basic first aid kit'
    ],
    exclusions: [
      'Personal snacks',
      'Dinner on Day 1',
      'Extra meals/soft drinks ordered',
      'Medical / Emergency evacuations',
      'Insurance',
      'Evening Snacks & Tea'
    ],
    thingsToCarry: [
      'Good quality shoes',
      'Cap',
      'Full sleeve shirt, Full trek pant',
      'Sunscreen',
      'Extra pair clothes',
      'Water bottle',
      'dry snacks'
    ],
    cancellationPolicy: [
      'Advance payment is strictly non-refundable.',
      'Cancellations allowed up to 5 days before trek. Only ₹500 refunded.',
      'No refund on last moment cancellation.',
      'Cannot postpone treks without prior notice.'
    ],
    images: [
      'https://images.unsplash.com/photo-1517436073-3b1b11f9f257?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1533240332313-0cb49e49b57a?auto=format&fit=crop&q=80'
    ],
    status: 'published'
  }
];
