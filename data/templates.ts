import { Trip } from './trips';
import { getStockImageForTrip } from './stockImages';

export interface TripTemplate {
  id: string;
  name: string;
  category: string;
  destination: string;
  templateData: Partial<Trip>;
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'tpl-1',
    name: '1️⃣ Harishchandragad & Kokankada',
    category: 'Trekking',
    destination: 'Harishchandragad',
    templateData: {
      title: 'Harishchandragad & Kokankada Trek',
      category: 'Trekking',
      destination: 'Harishchandragad',
      description: 'Explore the mighty Harishchandragad fort, ancient Kedareshwar cave, and experience the breathtaking drop of Kokankada cliff. Overnight trek with camping & sunrise view.',
      packages: [
        { name: 'Pune Transport', price: 999 },
        { name: 'Mumbai Transport', price: 1099 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 2 }
      ],
      addOns: [
        { name: 'Non-veg Dinner Extra', price: 150 },
        { name: 'Tent Twin Sharing', price: 200 }
      ],
      pickupPoints: [
        { location: 'Pune - Shivajinagar / Swargate', time: '10:00 PM' },
        { location: 'Mumbai - Dadar / Thane', time: '10:30 PM' }
      ],
      itinerary: 'Day 1 (Saturday Night): Departure from Pune/Mumbai\nDay 2 (Sunday): Reach base village, breakfast, ascend to Kokankada, lunch, explore caves, descend & return by Sunday night.',
      inclusions: ['To & Fro Bus Transport', 'Breakfast & Tea (1x)', 'Lunch (1x)', 'Trek Leader Expertise', 'First Aid'],
      exclusions: ['Personal Expenses', 'Dinner on Day 1', 'Anything not mentioned in inclusions'],
      thingsToCarry: ['Good Trekking Shoes', 'Water Bottle (2L)', 'Torch / Flashlight', 'Extra Pair of Clothes', 'Raincoat / Poncho'],
      cancellationPolicy: ['Non-refundable advance', 'Cancellations before 48 hrs get 50% credit'],
      images: [getStockImageForTrip('Harishchandragad', 'Trekking')]
    }
  },
  {
    id: 'tpl-2',
    name: '2️⃣ Kalsubai Peak Trek',
    category: 'Trekking',
    destination: 'Kalsubai',
    templateData: {
      title: 'Kalsubai Peak Trek (Highest Peak of Maharashtra)',
      category: 'Trekking',
      destination: 'Kalsubai',
      description: 'Conquer the Everest of Maharashtra (5,400 ft)! Enjoy night trekking under stars, beautiful sunrise view from Kalsubai temple at the summit, and lush green monsoon landscapes.',
      packages: [
        { name: 'Pune Transport', price: 999 },
        { name: 'Mumbai Transport', price: 899 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 4 }
      ],
      addOns: [
        { name: 'Trek Stick / Pole', price: 100 }
      ],
      pickupPoints: [
        { location: 'Pune - Swargate / Nashik Phata', time: '10:30 PM' },
        { location: 'Mumbai - Dadar / Kalyan', time: '11:00 PM' }
      ],
      itinerary: 'Day 1: Night departure\nDay 2: Reach Bari village at 4 AM, start trek, reach peak by 7 AM for sunrise, descend, village lunch, return journey.',
      inclusions: ['Transport', 'Breakfast', 'Veg Lunch', 'Guide Fees', 'Forest Entry'],
      exclusions: ['Insurance', 'Personal Snacks'],
      thingsToCarry: ['Jacket', 'Trekking Shoes', 'Water', 'Energy Bar'],
      cancellationPolicy: ['Non-refundable booking fee'],
      images: [getStockImageForTrip('Kalsubai', 'Trekking')]
    }
  },
  {
    id: 'tpl-3',
    name: '3️⃣ Adrai Jungle Trek',
    category: 'Trekking',
    destination: 'Adrai',
    templateData: {
      title: 'Adrai Jungle Trek (Monsoon Dense Forest Walk)',
      category: 'Trekking',
      destination: 'Adrai',
      description: 'One of the most beautiful jungle treks in Malshej Ghat region. Walk through dense evergreen forests, misty valleys, gushing streams, and hidden waterfalls.',
      packages: [
        { name: 'Pune Transport', price: 1099 },
        { name: 'Mumbai Transport', price: 1399 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 0 }
      ],
      addOns: [],
      pickupPoints: [
        { location: 'Pune - Shivajinagar', time: '11:00 PM' },
        { location: 'Mumbai - Dadar', time: '10:30 PM' }
      ],
      itinerary: 'Day 1: Night journey\nDay 2: Reach Khireshwar, breakfast, start jungle trail, explore Adrai forest stream, lunch, return journey.',
      inclusions: ['Bus Transport', 'Breakfast & Tea', 'Local Lunch', 'Forest Permit', 'Guide'],
      exclusions: ['Personal Expenses'],
      thingsToCarry: ['Rain Coat', 'Extra Clothes', 'Trekking Shoes'],
      cancellationPolicy: ['Non-refundable'],
      images: [getStockImageForTrip('Adrai', 'Trekking')]
    }
  },
  {
    id: 'tpl-4',
    name: '4️⃣ Ratangad Fort Trek',
    category: 'Trekking',
    destination: 'Ratangad',
    templateData: {
      title: 'Ratangad Fort Trek (Jewel of Sahyadri & Nedhe)',
      category: 'Trekking',
      destination: 'Ratangad',
      description: 'Visit the 400-year-old fort of Ratangad, famous for its natural rock cavity called Nedhe (Eye of the Needle) and stunning views of Bhandardara lake.',
      packages: [
        { name: 'Pune & Mumbai Transport', price: 1199 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 15, bookedSeats: 7 }
      ],
      addOns: [],
      pickupPoints: [
        { location: 'Pune / Mumbai Pickups', time: '10:00 PM' }
      ],
      itinerary: 'Day 1: Night departure\nDay 2: Reach Ratanwadi, visit Amruteshwar temple, climb fort via iron ladders, explore Nedhe, lunch, return.',
      inclusions: ['To & Fro Transport', 'Breakfast', 'Lunch', 'Expert Guides'],
      exclusions: ['Personal Expenses'],
      thingsToCarry: ['Shoes', 'Water', 'Warm Clothes'],
      cancellationPolicy: ['Standard Policy'],
      images: [getStockImageForTrip('Ratangad', 'Fort')]
    }
  },
  {
    id: 'tpl-5',
    name: '5️⃣ Raigad Fort Trek (Study Tour)',
    category: 'Fort',
    destination: 'Raigad',
    templateData: {
      title: 'Raigad Fort Trek & Historical Study Tour',
      category: 'Fort',
      destination: 'Raigad',
      description: 'Capital of Maratha Empire! Experience the rich history of Chhatrapati Shivaji Maharaj, visit Rajyabhishek spot, Meghdambari, Nagarkhana, and Hirkani Buruj.',
      packages: [
        { name: 'Pune Transport', price: 999 },
        { name: 'Mumbai Transport', price: 1299 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 6 }
      ],
      addOns: [{ name: 'Ropeway Ticket Extra', price: 350 }],
      pickupPoints: [
        { location: 'Pune Swargate', time: '05:00 AM' },
        { location: 'Mumbai Dadar', time: '04:30 AM' }
      ],
      itinerary: 'Early morning departure, reach base, climb/ropeway to fort, detailed historical tour by expert guide, lunch on top, return by evening.',
      inclusions: ['Bus Transport', 'Breakfast', 'Maharashtrian Thali Lunch', 'Historian Guide'],
      exclusions: ['Ropeway Ticket (Optional)'],
      thingsToCarry: ['Water Bottle', 'Cap', 'Walking Shoes'],
      cancellationPolicy: ['Non-refundable'],
      images: [getStockImageForTrip('Raigad', 'Fort')]
    }
  },
  {
    id: 'tpl-6',
    name: '6️⃣ Bhimashankar to Bhorgiri Trek',
    category: 'Trekking',
    destination: 'Bhimashankar',
    templateData: {
      title: 'Bhimashankar to Bhorgiri Jungle Range Trek',
      category: 'Trekking',
      destination: 'Bhimashankar',
      description: 'A soothing jungle walk connecting Bhimashankar Jyotirlinga sanctuary to Bhorgiri fort. Ancient caves, dense forest cover, and fresh monsoon air.',
      packages: [
        { name: 'Pune Transport', price: 1099 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 10 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Shivajinagar', time: '05:30 AM' }],
      itinerary: 'Early morning travel to Bhorgiri, trek along Bhima river in jungle towards Bhimashankar temple, darshan, lunch, return.',
      inclusions: ['Transport', 'Breakfast', 'Lunch', 'Entry Fees'],
      exclusions: ['Personal Expenses'],
      thingsToCarry: ['Rainwear', 'Trekking Shoes', 'Water'],
      cancellationPolicy: ['Standard'],
      images: [getStockImageForTrip('Bhimashankar', 'Trekking')]
    }
  },
  {
    id: 'tpl-7',
    name: '7️⃣ Naneghat Reverse Waterfall',
    category: 'Waterfall',
    destination: 'Naneghat',
    templateData: {
      title: 'Naneghat Ancient Pass & Reverse Waterfall Trek',
      category: 'Waterfall',
      destination: 'Naneghat',
      description: 'Witness nature defying gravity at Naneghat reverse waterfall! Explore the 2000-year-old Satavahana era trade route and ancient Brahmi script caves.',
      packages: [
        { name: 'Pune Transport', price: 1099 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 6 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Swargate', time: '05:30 AM' }],
      itinerary: 'Morning travel, reach Ghatghar, witness reverse waterfall breeze, explore Naneghat cave, lunch, return.',
      inclusions: ['Transport', 'Breakfast', 'Lunch', 'Guide'],
      exclusions: ['Extra snacks'],
      thingsToCarry: ['Rainwear', 'Dry Bag for Mobile'],
      cancellationPolicy: ['Non-refundable'],
      images: [getStockImageForTrip('Naneghat', 'Waterfall')]
    }
  },
  {
    id: 'tpl-8',
    name: '8️⃣ Nanemachi & Satsada Waterfall',
    category: 'Waterfall',
    destination: 'Nanemachi',
    templateData: {
      title: 'Nanemachi & Satsada Waterfall Exploration',
      category: 'Waterfall',
      destination: 'Nanemachi',
      description: 'Hidden gem in Konkan region! Huge roaring waterfall amidst virgin rainforests, blue pools, and serene nature trail.',
      packages: [
        { name: 'Pune Transport', price: 1199 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 8 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Swargate', time: '11:00 PM (Sat)' }],
      itinerary: 'Overnight journey to Mahad region, morning reach village, trek to Nanemachi & Satsada waterfall, splash & lunch, evening return.',
      inclusions: ['Transport', 'Breakfast', 'Konkani Lunch', 'First Aid'],
      exclusions: ['Personal Expenses'],
      thingsToCarry: ['Extra Clothes', 'Towel', 'Water Bottle'],
      cancellationPolicy: ['Standard Policy'],
      images: [getStockImageForTrip('Nanemachi', 'Waterfall')]
    }
  },
  {
    id: 'tpl-9',
    name: '9️⃣ Devkund Waterfall Trek',
    category: 'Waterfall',
    destination: 'Devkund',
    templateData: {
      title: 'Devkund Waterfall Trek (The Blue Lagoon of Maharashtra)',
      category: 'Waterfall',
      destination: 'Devkund',
      description: 'Trek through dense forests and riverbeds to reach the spectacular Devkund waterfall plunging into a crystal-clear turquoise natural pool near Bhira.',
      packages: [
        { name: 'Pune Transport', price: 1099 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 6 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Swargate', time: '05:00 AM' }],
      itinerary: 'Early morning bus to Bhira dam, 3-hour jungle trek along river, enjoy Devkund pool, descend, rustic lunch, return to Pune.',
      inclusions: ['Non-AC Bus Transport', 'Breakfast & Tea', 'Buffet Lunch', 'Local Guide & Entry Charges'],
      exclusions: ['Lifejacket rental if taken'],
      thingsToCarry: ['Good Grip Shoes', 'Polythene bag for gadgets', 'Extra clothes'],
      cancellationPolicy: ['Non-refundable'],
      images: [getStockImageForTrip('Devkund', 'Waterfall')]
    }
  },
  {
    id: 'tpl-10',
    name: '🔟 Kaas Pathar & Ajinkyatara w/ Kaas Lake',
    category: 'Trekking',
    destination: 'Kaas Pathar',
    templateData: {
      title: 'Kaas Pathar (Valley of Flowers), Ajinkyatara Fort & Ekiv Waterfall',
      category: 'Trekking',
      destination: 'Kaas Pathar',
      description: 'UNESCO World Heritage Site! Marvel at millions of wild carpet flowers blooming on Kaas Plateau, visit scenic Kaas Lake, Ekiv waterfall, and historical Ajinkyatara fort in Satara.',
      packages: [
        { name: 'Pune Transport', price: 1450 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 6 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Swargate / Katraj', time: '05:30 AM' }],
      itinerary: 'Morning drive to Satara, visit Kaas Plateau flowers with official guide, Kaas lake view, lunch, afternoon visit Ekiv waterfall & Ajinkyatara fort, return by night.',
      inclusions: ['AC/Non-AC Transport', 'Kaas Plateau Govt Entry Pass', 'Breakfast', 'Satara Special Lunch'],
      exclusions: ['Camera fees'],
      thingsToCarry: ['Camera', 'Sunscreen', 'Comfortable Shoes'],
      cancellationPolicy: ['Non-refundable Govt pass'],
      images: [getStockImageForTrip('Kaas Pathar', 'Trekking')]
    }
  },
  {
    id: 'tpl-11',
    name: '1️⃣1️⃣ Raireshwar & Kenjalgad Trek',
    category: 'Fort',
    destination: 'Raireshwar',
    templateData: {
      title: 'Raireshwar Temple & Kenjalgad Fort Twin Trek',
      category: 'Fort',
      destination: 'Raireshwar',
      description: 'Visit Raireshwar temple where Chhatrapati Shivaji Maharaj took the oath of Swarajya at age 16! Also explore the iron ladders and giant rock-cut steps of Kenjalgad.',
      packages: [
        { name: 'Pune Transport', price: 1199 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 6 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Swargate', time: '05:30 AM' }],
      itinerary: 'Early travel to Bhor region, ascend Raireshwar plateau via ladder, visit temple, move to Kenjalgad, explore fort top, lunch, evening return.',
      inclusions: ['Transport', 'Breakfast', 'Homecooked Village Lunch', 'Trek Leader'],
      exclusions: ['Personal Expenses'],
      thingsToCarry: ['Water Bottle', 'Trekking Shoes', 'Rainwear'],
      cancellationPolicy: ['Standard'],
      images: [getStockImageForTrip('Raireshwar', 'Fort')]
    }
  },
  {
    id: 'tpl-12',
    name: '1️⃣2️⃣ Dhakoba Peak Trek',
    category: 'Trekking',
    destination: 'Dhakoba',
    templateData: {
      title: 'Dhakoba Peak & Darya Ghat Offbeat Trek',
      category: 'Trekking',
      destination: 'Dhakoba',
      description: 'An offbeat high-altitude peak in Junnar region offering panoramic views of Malshej ghats, Kukdeshwar temple, and untouched Sahyadri wilderness.',
      packages: [
        { name: 'Pune Transport', price: 1199 }
      ],
      batches: [
        { id: 'b1', dateDuration: '05-06 Sep (Sat night to Sun night)', totalSeats: 20, bookedSeats: 7 }
      ],
      addOns: [],
      pickupPoints: [{ location: 'Pune Swargate / Nashik Phata', time: '11:00 PM (Sat)' }],
      itinerary: 'Overnight journey to base village Ambe, morning ascend to Dhakoba peak (5000 ft), explore Darya ghat viewpoint, lunch, return.',
      inclusions: ['Bus Transport', 'Breakfast', 'Lunch', 'Guide Charges'],
      exclusions: ['Personal Expenses'],
      thingsToCarry: ['Trekking Shoes', 'Torch', 'Water 2L'],
      cancellationPolicy: ['Non-refundable'],
      images: [getStockImageForTrip('Dhakoba', 'Trekking')]
    }
  }
];
