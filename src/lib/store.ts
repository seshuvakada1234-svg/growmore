
import { PlaceHolderImages } from "./placeholder-images";

export type Category = "Indoor" | "Outdoor" | "Seeds" | "Bonsai" | "Indoor Plants" | "Outdoor Plants" | "Succulents" | "Tropical Plants";

export interface Plant {
  id: string;
  name: string;
  category: Category;
  price: number;
  originalPrice?: number;
  oldPrice?: number; // For compatibility
  discount?: number;
  description: string;
  careGuide: string;
  imageUrl: string;
  images: string[];
  rating: number;
  reviewCount: number;
  reviewsCount?: number; // For compatibility
  stock: number;
  isBestseller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  careLevel: 'easy' | 'moderate' | 'hard';
  watering: string;
  sunlight: 'low' | 'medium' | 'bright' | 'full-sun';
  size: 'small' | 'medium' | 'large';
  weight: string;
  height: string;
  benefits: string[];
  potIncluded: boolean;
  tags: string[];
}

export const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low to High', value: 'price-low' },
  { label: 'Price: High to Low', value: 'price-high' },
  { label: 'Customer Rating', value: 'rating' },
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Biggest Discount', value: 'discount' },
];

export const MOCK_PLANTS: Plant[] = [
  {
    id: "p1",
    name: "Monstera Deliciosa",
    category: "Indoor Plants",
    price: 1299,
    originalPrice: 1599,
    discount: 18,
    description: "The Monstera Deliciosa, also known as the Swiss Cheese Plant, is a stunning tropical plant famous for its large, heart-shaped leaves with unique natural holes.",
    careGuide: "Keep in bright, indirect light. Water when the top inch of soil is dry.",
    imageUrl: "https://picsum.photos/seed/monstera/600/600",
    images: [
      "https://picsum.photos/seed/monstera/800/800",
      "https://picsum.photos/seed/monstera2/800/800",
      "https://picsum.photos/seed/monstera3/800/800"
    ],
    rating: 4.8,
    reviewCount: 124,
    stock: 15,
    isBestseller: true,
    isFeatured: true,
    careLevel: 'moderate',
    watering: 'Once a week',
    sunlight: 'medium',
    size: 'medium',
    weight: '2.5 kg',
    height: '24-30 inches',
    benefits: ['Air Purifying', 'Low Maintenance', 'Statement Piece'],
    potIncluded: true,
    tags: ['indoor', 'tropical', 'popular']
  },
  {
    id: "p2",
    name: "Snake Plant Zeylanica",
    category: "Indoor Plants",
    price: 499,
    originalPrice: 699,
    discount: 28,
    description: "Snake Plants are architectural marvels that thrive on neglect. They are excellent air purifiers.",
    careGuide: "Low to bright light. Water every 2-3 weeks.",
    imageUrl: "https://picsum.photos/seed/snakeplant/600/600",
    images: ["https://picsum.photos/seed/snakeplant/800/800"],
    rating: 4.9,
    reviewCount: 89,
    stock: 20,
    isNew: true,
    careLevel: 'easy',
    watering: 'Every 2 weeks',
    sunlight: 'low',
    size: 'small',
    weight: '1.2 kg',
    height: '12-18 inches',
    benefits: ['Oxygen Booster', 'Drought Tolerant'],
    potIncluded: true,
    tags: ['beginner', 'low light']
  },
  {
    id: "p3",
    name: "Fiddle Leaf Fig",
    category: "Indoor Plants",
    price: 2499,
    description: "The Fiddle Leaf Fig is the ultimate statement piece for any modern home with its broad leaves.",
    careGuide: "Bright indirect light is essential. Water only when top soil is dry.",
    imageUrl: "https://picsum.photos/seed/fiddle/600/600",
    images: ["https://picsum.photos/seed/fiddle/800/800"],
    rating: 4.5,
    reviewCount: 56,
    stock: 8,
    careLevel: 'hard',
    watering: 'Weekly',
    sunlight: 'bright',
    size: 'large',
    weight: '5 kg',
    height: '4-5 feet',
    benefits: ['Interior Icon', 'Large Leaves'],
    potIncluded: true,
    tags: ['statement', 'premium']
  },
  {
    id: "p4",
    name: "Aloe Vera Premium",
    category: "Succulents",
    price: 299,
    originalPrice: 399,
    discount: 25,
    description: "Aloe Vera is a succulent plant species of the genus Aloe. It is used in many consumer products.",
    careGuide: "Bright direct light. Water sparingly.",
    imageUrl: "https://picsum.photos/seed/aloe/600/600",
    images: ["https://picsum.photos/seed/aloe/800/800"],
    rating: 4.7,
    reviewCount: 210,
    stock: 45,
    careLevel: 'easy',
    watering: 'Every 3 weeks',
    sunlight: 'full-sun',
    size: 'small',
    weight: '0.8 kg',
    height: '8-12 inches',
    benefits: ['Medicinal Use', 'Easy to Grow'],
    potIncluded: false,
    tags: ['succulent', 'sun loving']
  }
];

export const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

export const getRelatedPlants = (plant: Plant, count: number) => {
  return MOCK_PLANTS.filter(p => p.id !== plant.id && p.category === plant.category).slice(0, count);
};
