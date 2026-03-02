// Global mock data store for PlantShop

export type UserRole = 'guest' | 'user' | 'affiliate' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  isAffiliate: boolean;
  affiliateCode?: string;
  affiliateEarnings?: number;
}

export interface Plant {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  description: string;
  careLevel: 'easy' | 'moderate' | 'hard';
  sunlight: 'low' | 'medium' | 'bright' | 'full-sun';
  watering: string;
  size: 'small' | 'medium' | 'large';
  stock: number;
  tags: string[];
  benefits: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  isFeatured?: boolean;
  potIncluded: boolean;
  weight: string;
  height: string;
}

export interface CartItem {
  plantId: string;
  quantity: number;
  addedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: { plantId: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  address: string;
  createdAt: string;
  affiliateCode?: string;
}

export interface AffiliateProfile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bankAccount: string;
  ifsc: string;
  upiId: string;
  referralCode: string;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  joinedAt: string;
  status: 'pending' | 'approved' | 'blocked';
  referrals: number;
}

// ── Mock Plants Data ──
export const MOCK_PLANTS: Plant[] = [
  {
    id: 'p1',
    name: 'Monstera Deliciosa',
    slug: 'monstera-deliciosa',
    category: 'Indoor Plants',
    price: 649,
    originalPrice: 999,
    discount: 35,
    rating: 4.7,
    reviewCount: 2847,
    images: [
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80',
      'https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?w=600&q=80',
      'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=600&q=80'
    ],
    description: 'The iconic Swiss cheese plant with its distinctive split leaves. Perfect for brightening up any living space. Grows into a stunning statement piece that improves air quality.',
    careLevel: 'easy',
    sunlight: 'medium',
    watering: 'Once a week',
    size: 'medium',
    stock: 45,
    tags: ['air-purifying', 'statement-plant', 'popular'],
    benefits: ['Air purifying', 'Low maintenance', 'Aesthetic appeal', 'Fast growing'],
    isBestseller: true,
    isFeatured: true,
    potIncluded: true,
    weight: '1.2 kg',
    height: '40–60 cm'
  },
  {
    id: 'p2',
    name: 'Peace Lily',
    slug: 'peace-lily',
    category: 'Indoor Plants',
    price: 349,
    originalPrice: 499,
    discount: 30,
    rating: 4.8,
    reviewCount: 4521,
    images: [
      'https://images.unsplash.com/photo-1593482892290-f54927ae1bb6?w=600&q=80',
      'https://images.unsplash.com/photo-1607434472257-d9f8e57a643d?w=600&q=80'
    ],
    description: 'The Peace Lily is one of the most popular houseplants. Thrives in low light, cleans the air, and blooms with elegant white flowers.',
    careLevel: 'easy',
    sunlight: 'low',
    watering: 'Twice a week',
    size: 'small',
    stock: 120,
    tags: ['air-purifying', 'flowering', 'low-light'],
    benefits: ['Removes toxins', 'Flowers indoors', 'Low light tolerant'],
    isBestseller: true,
    isFeatured: true,
    potIncluded: true,
    weight: '0.6 kg',
    height: '25–35 cm'
  },
  {
    id: 'p3',
    name: 'Snake Plant (Sansevieria)',
    slug: 'snake-plant',
    category: 'Indoor Plants',
    price: 299,
    originalPrice: 449,
    discount: 33,
    rating: 4.9,
    reviewCount: 6102,
    images: [
      'https://images.unsplash.com/photo-1598880940371-c756e015fea1?w=600&q=80',
      'https://images.unsplash.com/photo-1599598425947-5202edd56bdb?w=600&q=80'
    ],
    description: 'The ultimate beginner plant. Extremely resilient, purifies air even at night, and requires almost no care. Perfect for bedrooms and offices.',
    careLevel: 'easy',
    sunlight: 'low',
    watering: 'Every 2–3 weeks',
    size: 'medium',
    stock: 200,
    tags: ['air-purifying', 'bedroom', 'beginner-friendly'],
    benefits: ['Night oxygen production', 'Extremely low maintenance', 'Pest resistant'],
    isBestseller: true,
    isFeatured: false,
    potIncluded: false,
    weight: '0.8 kg',
    height: '30–50 cm'
  },
  {
    id: 'p4',
    name: 'Fiddle Leaf Fig',
    slug: 'fiddle-leaf-fig',
    category: 'Indoor Plants',
    price: 1299,
    originalPrice: 1799,
    discount: 28,
    rating: 4.5,
    reviewCount: 1203,
    images: [
      'https://images.unsplash.com/photo-1616690248260-6e4b8af2f5b5?w=600&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
    ],
    description: "The designer's favourite. Large, glossy violin-shaped leaves create a dramatic focal point. Perfect for bright living rooms and offices.",
    careLevel: 'hard',
    sunlight: 'bright',
    watering: 'Once a week',
    size: 'large',
    stock: 18,
    tags: ['statement-plant', 'designer', 'large'],
    benefits: ['Architectural appeal', 'Air purifying', 'Instagram-worthy'],
    isFeatured: true,
    isNew: false,
    potIncluded: true,
    weight: '3.5 kg',
    height: '80–120 cm'
  },
  {
    id: 'p5',
    name: 'Pothos (Golden)',
    slug: 'golden-pothos',
    category: 'Indoor Plants',
    price: 199,
    originalPrice: 299,
    discount: 33,
    rating: 4.8,
    reviewCount: 8934,
    images: [
      'https://images.unsplash.com/photo-1629196613975-4aad5c1b9a0b?w=600&q=80',
      'https://images.unsplash.com/photo-1622467827417-bbe2237067a9?w=600&q=80'
    ],
    description: 'The most forgiving plant ever. Trailing vines with golden-green leaves. Perfect for hanging baskets, shelves, and beginners.',
    careLevel: 'easy',
    sunlight: 'low',
    watering: 'Once a week',
    size: 'small',
    stock: 350,
    tags: ['hanging', 'trailing', 'beginner-friendly', 'air-purifying'],
    benefits: ['Virtually indestructible', 'Fast growing', 'Versatile display'],
    isBestseller: true,
    potIncluded: false,
    weight: '0.3 kg',
    height: 'Trailing 30–60 cm'
  },
  {
    id: 'p6',
    name: 'ZZ Plant',
    slug: 'zz-plant',
    category: 'Indoor Plants',
    price: 449,
    originalPrice: 649,
    discount: 31,
    rating: 4.7,
    reviewCount: 2156,
    images: [
      'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=600&q=80',
      'https://images.unsplash.com/photo-1599598425947-5202edd56bdb?w=600&q=80'
    ],
    description: 'Glossy, waxy leaves on elegant arching stems. The ZZ plant thrives on neglect and is nearly impossible to kill. Perfect for dark corners.',
    careLevel: 'easy',
    sunlight: 'low',
    watering: 'Every 2–3 weeks',
    size: 'medium',
    stock: 80,
    tags: ['low-light', 'drought-tolerant', 'office'],
    benefits: ['Tolerates neglect', 'Glossy aesthetic', 'Drought tolerant'],
    isNew: true,
    potIncluded: true,
    weight: '0.9 kg',
    height: '35–55 cm'
  },
  {
    id: 'p7',
    name: 'Aloe Vera',
    slug: 'aloe-vera',
    category: 'Succulents',
    price: 179,
    originalPrice: 249,
    discount: 28,
    rating: 4.9,
    reviewCount: 12043,
    images: [
      'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=600&q=80',
      'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=600&q=80'
    ],
    description: 'The wonder plant. Medicinal gel for burns and skin care. Extremely low maintenance, thrives in sunny spots. A household essential.',
    careLevel: 'easy',
    sunlight: 'full-sun',
    watering: 'Every 2 weeks',
    size: 'small',
    stock: 500,
    tags: ['medicinal', 'succulent', 'kitchen-windowsill'],
    benefits: ['Medicinal properties', 'Air purifying', 'Edible gel'],
    isBestseller: true,
    potIncluded: false,
    weight: '0.4 kg',
    height: '20–30 cm'
  },
  {
    id: 'p8',
    name: 'Rubber Plant (Ficus)',
    slug: 'rubber-plant',
    category: 'Indoor Plants',
    price: 549,
    originalPrice: 799,
    discount: 31,
    rating: 4.6,
    reviewCount: 1876,
    images: [
      'https://images.unsplash.com/photo-1603436326446-74f5a7e7f585?w=600&q=80',
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80'
    ],
    description: 'Bold, deep-burgundy leaves with a rubbery sheen. The Rubber Plant is a classic statement tree that grows tall and dramatic in bright indoor spaces.',
    careLevel: 'moderate',
    sunlight: 'bright',
    watering: 'Once a week',
    size: 'large',
    stock: 35,
    tags: ['statement-plant', 'burgundy', 'tall'],
    benefits: ['Air purifying', 'Dramatic foliage', 'Fast growing'],
    isNew: true,
    isFeatured: true,
    potIncluded: true,
    weight: '2.8 kg',
    height: '60–90 cm'
  },
  {
    id: 'p9',
    name: 'Spider Plant',
    slug: 'spider-plant',
    category: 'Indoor Plants',
    price: 149,
    originalPrice: 199,
    discount: 25,
    rating: 4.8,
    reviewCount: 5432,
    images: [
      'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=600&q=80',
      'https://images.unsplash.com/photo-1622467827417-bbe2237067a9?w=600&q=80'
    ],
    description: 'Cheerful arching leaves with white stripes. Produces baby plantlets on runners — a living, growing gift that keeps on giving.',
    careLevel: 'easy',
    sunlight: 'medium',
    watering: 'Twice a week',
    size: 'small',
    stock: 220,
    tags: ['hanging', 'air-purifying', 'pet-safe'],
    benefits: ['Pet-safe', 'Air purifying', 'Self-propagating'],
    isBestseller: false,
    potIncluded: false,
    weight: '0.3 kg',
    height: 'Trailing 20–40 cm'
  },
  {
    id: 'p10',
    name: 'Bird of Paradise',
    slug: 'bird-of-paradise',
    category: 'Indoor Plants',
    price: 1899,
    originalPrice: 2499,
    discount: 24,
    rating: 4.6,
    reviewCount: 743,
    images: [
      'https://images.unsplash.com/photo-1558618047-f4e90b40d4e4?w=600&q=80',
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80'
    ],
    description: 'Tropical grandeur at its finest. Giant paddle-shaped leaves bring the jungle indoors. A true luxury statement plant for large spaces.',
    careLevel: 'moderate',
    sunlight: 'bright',
    watering: 'Once a week',
    size: 'large',
    stock: 12,
    tags: ['luxury', 'tropical', 'large', 'statement-plant'],
    benefits: ['Dramatic presence', 'Air purifying', 'Humidity lover'],
    isFeatured: true,
    isNew: true,
    potIncluded: true,
    weight: '5 kg',
    height: '100–150 cm'
  },
  {
    id: 'p11',
    name: 'Jade Plant',
    slug: 'jade-plant',
    category: 'Succulents',
    price: 229,
    originalPrice: 299,
    discount: 23,
    rating: 4.7,
    reviewCount: 3201,
    images: [
      'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=600&q=80',
      'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=600&q=80'
    ],
    description: 'Considered a symbol of good luck and prosperity. Thick, jade-green oval leaves on woody stems. Grows for decades with minimal care.',
    careLevel: 'easy',
    sunlight: 'bright',
    watering: 'Every 2 weeks',
    size: 'small',
    stock: 160,
    tags: ['lucky-plant', 'succulent', 'gifting'],
    benefits: ['Symbol of luck', 'Very long-lived', 'Low water needs'],
    potIncluded: false,
    weight: '0.5 kg',
    height: '20–35 cm'
  },
  {
    id: 'p12',
    name: 'Calathea Orbifolia',
    slug: 'calathea-orbifolia',
    category: 'Tropical Plants',
    price: 799,
    originalPrice: 1099,
    discount: 27,
    rating: 4.5,
    reviewCount: 987,
    images: [
      'https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?w=600&q=80',
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80'
    ],
    description: 'Stunning silver-striped round leaves that move with light. The Calathea Orbifolia is a living work of art that adds elegance to any room.',
    careLevel: 'hard',
    sunlight: 'low',
    watering: 'Twice a week',
    size: 'medium',
    stock: 28,
    tags: ['patterned-leaves', 'tropical', 'humidity-lover'],
    benefits: ['Stunning patterns', 'Air humidifying', 'Unique movement'],
    isNew: true,
    potIncluded: true,
    weight: '1.1 kg',
    height: '35–50 cm'
  },
  {
    id: 'p13',
    name: 'Cactus Mix (Set of 3)',
    slug: 'cactus-mix-set',
    category: 'Succulents',
    price: 399,
    originalPrice: 599,
    discount: 33,
    rating: 4.8,
    reviewCount: 4312,
    images: [
      'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=600&q=80',
      'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=600&q=80'
    ],
    description: 'A curated set of 3 different cacti varieties. Perfect for windowsills and desks. Zero drama, maximum visual interest.',
    careLevel: 'easy',
    sunlight: 'full-sun',
    watering: 'Monthly',
    size: 'small',
    stock: 85,
    tags: ['set', 'cactus', 'desk-plant', 'gifting'],
    benefits: ['Set of 3 varieties', 'Minimal watering', 'Long-lasting'],
    isBestseller: true,
    potIncluded: true,
    weight: '0.6 kg',
    height: '10–20 cm each'
  },
  {
    id: 'p14',
    name: 'Money Plant (Epipremnum)',
    slug: 'money-plant',
    category: 'Indoor Plants',
    price: 129,
    originalPrice: 179,
    discount: 28,
    rating: 4.9,
    reviewCount: 15623,
    images: [
      'https://images.unsplash.com/photo-1629196613975-4aad5c1b9a0b?w=600&q=80',
      'https://images.unsplash.com/photo-1622467827417-bbe2237067a9?w=600&q=80'
    ],
    description: "India's most beloved houseplant. Bright heart-shaped leaves bring prosperity and cheer. Grows in water or soil — incredibly versatile.",
    careLevel: 'easy',
    sunlight: 'low',
    watering: 'Once a week',
    size: 'small',
    stock: 800,
    tags: ['lucky-plant', 'beginner-friendly', 'air-purifying'],
    benefits: ['Grows in water or soil', 'Brings prosperity', 'Extremely easy'],
    isBestseller: true,
    potIncluded: false,
    weight: '0.2 kg',
    height: 'Trailing 20–50 cm'
  },
  {
    id: 'p15',
    name: 'Philodendron Brasil',
    slug: 'philodendron-brasil',
    category: 'Tropical Plants',
    price: 499,
    originalPrice: 699,
    discount: 29,
    rating: 4.7,
    reviewCount: 1654,
    images: [
      'https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?w=600&q=80',
      'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=600&q=80'
    ],
    description: 'Striking variegated leaves in neon green and lime yellow. A fast-growing tropical vine that looks spectacular in hanging baskets.',
    careLevel: 'easy',
    sunlight: 'medium',
    watering: 'Once a week',
    size: 'medium',
    stock: 60,
    tags: ['variegated', 'trailing', 'tropical', 'colorful'],
    benefits: ['Vibrant colors', 'Fast growing', 'Easy care'],
    isNew: true,
    potIncluded: false,
    weight: '0.5 kg',
    height: 'Trailing 30–60 cm'
  },
  {
    id: 'p16',
    name: 'Bamboo Palm',
    slug: 'bamboo-palm',
    category: 'Outdoor Plants',
    price: 899,
    originalPrice: 1299,
    discount: 31,
    rating: 4.6,
    reviewCount: 892,
    images: [
      'https://images.unsplash.com/photo-1558618047-f4e90b40d4e4?w=600&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
    ],
    description: 'Elegant feathery fronds on slender bamboo-like stems. Creates a tropical paradise on balconies and patios. Excellent air purifier.',
    careLevel: 'moderate',
    sunlight: 'bright',
    watering: 'Twice a week',
    size: 'large',
    stock: 22,
    tags: ['outdoor', 'balcony', 'tropical', 'air-purifying'],
    benefits: ['Outdoor beauty', 'Air purifying', 'Wind tolerant'],
    isFeatured: false,
    potIncluded: true,
    weight: '4 kg',
    height: '90–130 cm'
  }
];

// ── Mock Users ──
export const MOCK_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Seshu Vakada',
    email: 'seshuvakada1234@gmail.com',
    role: 'admin',
    avatar: 'https://img.rocket.new/generatedImages/rocket_gen_img_16a0e3435-1768888509385.png',
    joinedAt: '2024-01-01',
    isAffiliate: false
  },
  {
    id: 'user-1',
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    phone: '9876543210',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&q=80',
    joinedAt: '2025-06-15',
    isAffiliate: false
  },
  {
    id: 'user-2',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@gmail.com',
    phone: '9123456789',
    role: 'affiliate',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80',
    joinedAt: '2025-03-20',
    isAffiliate: true,
    affiliateCode: 'ARJUN20',
    affiliateEarnings: 4250
  }
];

// ── App State (client-side mock store) ──
export type AppState = {
  currentUser: User | null;
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
  affiliates: AffiliateProfile[];
  plants: Plant[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
};

export const CATEGORIES = [
  { id: 'all', label: 'All Plants', icon: '🌿', count: 16 },
  { id: 'indoor', label: 'Indoor Plants', icon: '🪴', count: 9 },
  { id: 'outdoor', label: 'Outdoor Plants', icon: '🌳', count: 2 },
  { id: 'succulents', label: 'Succulents', icon: '🌵', count: 4 },
  { id: 'tropical', label: 'Tropical', icon: '🌴', count: 3 },
  { id: 'air-purifying', label: 'Air Purifying', icon: '💨', count: 8 },
  { id: 'gifting', label: 'Gifting', icon: '🎁', count: 5 }
];

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'discount', label: 'Biggest Discount' }
];

// ── Utility ──
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function getPlantById(id: string): Plant | undefined {
  return MOCK_PLANTS.find((p) => p.id === id);
}

export function getPlantBySlug(slug: string): Plant | undefined {
  return MOCK_PLANTS.find((p) => p.slug === slug);
}

export function getRelatedPlants(plant: Plant, count = 4): Plant[] {
  return MOCK_PLANTS.filter(
    (p) =>
      p.id !== plant.id &&
      (p.category === plant.category || p.tags.some((t) => plant.tags.includes(t)))
  ).slice(0, count);
}
