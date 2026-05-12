export interface Trip {
  id: string;
  vendorName: string;
  vendorWhatsApp: string;
  vendorUPI: string;
  title: string;
  description: string;
  dateDuration: string;
  images: string[];
  totalSeats: number;
  bookedSeats: number;
  price: string;
}

export const trips: Trip[] = [
  {
    id: '1',
    vendorName: 'Adventure Getaways',
    vendorWhatsApp: '+1234567890',
    vendorUPI: 'merchant@bank',
    title: 'Trip to Honnavar',
    description: 'Experience the breathtaking backwaters and pristine beaches of Honnavar. This weekend getaway includes boating, camping, and local cuisine.',
    dateDuration: '27th May to 29th May 2026',
    images: [
      'https://images.unsplash.com/photo-1620023447385-e10db5674720?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1594917406979-9941bd74f767?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1569145610892-e42bc02a24fa?q=80&w=800&auto=format&fit=crop',
    ],
    totalSeats: 20,
    bookedSeats: 12,
    price: '₹1500',
  },
  {
    id: '2',
    vendorName: 'Mountain Explorers',
    vendorWhatsApp: '+1987654321',
    vendorUPI: 'merchant2@bank',
    title: 'Coorg Weekend Retreat',
    description: 'Escape to the Scotland of India. Enjoy coffee plantation walks, waterfalls, and cozy homestays in the misty hills of Coorg.',
    dateDuration: '5th June to 7th June 2026',
    images: [
      'https://images.unsplash.com/photo-1590342621020-f56b772b7a95?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1616198642345-0d41eb3a71b1?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1623838271783-da120ce95159?q=80&w=800&auto=format&fit=crop',
    ],
    totalSeats: 15,
    bookedSeats: 15,
    price: '₹2000',
  },
  {
    id: '3',
    vendorName: 'Beach Bums',
    vendorWhatsApp: '+1122334455',
    vendorUPI: 'merchant3@bank',
    title: 'Gokarna Beach Trek',
    description: 'Trek across the famous 5 beaches of Gokarna. Stargazing, beach camping, and glorious sunsets await!',
    dateDuration: '12th June to 14th June 2026',
    images: [
      'https://images.unsplash.com/photo-1590341777553-63d12232a58b?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1590341764619-20412808c1f0?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=800&auto=format&fit=crop',
    ],
    totalSeats: 30,
    bookedSeats: 5,
    price: '₹1200',
  }
];
