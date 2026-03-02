
import { PlaceHolderImages } from "./placeholder-images";

export type Category = "Indoor" | "Outdoor" | "Seeds" | "Bonsai";

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  description: string;
  careGuide: string;
  imageUrl: string;
  images: string[];
  rating: number;
  reviewCount: number;
  reviewsCount: number; // For compatibility
  stock: number;
  isBestseller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  careLevel: 'easy' | 'moderate' | 'hard';
  watering: string;
  sunlight: 'low' | 'medium' | 'bright' | 'full-sun';
  weight: string;
  height: string;
  benefits: string[];
  potIncluded: boolean;
}

export type Plant = Product; // Alias for compatibility

export const CATEGORIES: Category[] = ["Indoor", "Outdoor", "Seeds", "Bonsai"];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Monstera Deliciosa",
    category: "Indoor",
    price: 1299,
    oldPrice: 1599,
    description: "The Monstera Deliciosa, also known as the Swiss Cheese Plant, is a stunning tropical plant famous for its large, heart-shaped leaves with unique natural holes (fenestrations). It adds an instant jungle vibe to any interior space.",
    careGuide: "Keep in bright, indirect light. Water when the top inch of soil is dry. Mist leaves occasionally.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-monstera")?.imageUrl || "",
    images: [
      PlaceHolderImages.find(img => img.id === "plant-monstera")?.imageUrl || "",
      "https://picsum.photos/seed/monstera2/800/800",
      "https://picsum.photos/seed/monstera3/800/800"
    ],
    rating: 4.8,
    reviewCount: 124,
    reviewsCount: 124,
    stock: 15,
    isBestseller: true,
    isFeatured: true,
    careLevel: 'moderate',
    watering: 'Once a week',
    sunlight: 'medium',
    weight: '2.5 kg',
    height: '24-30 inches',
    benefits: ['Air Purifying', 'Low Maintenance', 'Statement Piece'],
    potIncluded: true
  },
  {
    id: "2",
    name: "Snake Plant Zeylanica",
    category: "Indoor",
    price: 499,
    oldPrice: 699,
    description: "Snake Plants are architectural marvels that thrive on neglect. They are excellent air purifiers and can tolerate low light conditions, making them perfect for beginners or low-light rooms.",
    careGuide: "Low to bright light. Water every 2-3 weeks. Do not overwater.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-snake")?.imageUrl || "",
    images: [
      PlaceHolderImages.find(img => img.id === "plant-snake")?.imageUrl || "",
      "https://picsum.photos/seed/snake2/800/800"
    ],
    rating: 4.9,
    reviewCount: 89,
    reviewsCount: 89,
    stock: 20,
    isNew: true,
    isFeatured: true,
    careLevel: 'easy',
    watering: 'Every 2 weeks',
    sunlight: 'low',
    weight: '1.2 kg',
    height: '12-18 inches',
    benefits: ['Oxygen Booster', 'Drought Tolerant', 'Sleep Better'],
    potIncluded: true
  },
  {
    id: "3",
    name: "Fiddle Leaf Fig",
    category: "Indoor",
    price: 2499,
    description: "The Fiddle Leaf Fig is the ultimate statement piece for any modern home. Its broad, violin-shaped leaves create a dramatic aesthetic that complements minimalist decor perfectly.",
    careGuide: "Bright indirect light is essential. Water only when top soil is dry. Rotate occasionally.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-fiddle")?.imageUrl || "",
    images: [
      PlaceHolderImages.find(img => img.id === "plant-fiddle")?.imageUrl || "",
      "https://picsum.photos/seed/fiddle2/800/800"
    ],
    rating: 4.5,
    reviewCount: 56,
    reviewsCount: 56,
    stock: 8,
    isFeatured: true,
    careLevel: 'hard',
    watering: 'Weekly',
    sunlight: 'bright',
    weight: '5 kg',
    height: '4-5 feet',
    benefits: ['Interior Icon', 'Large Leaves', 'Humidity Loving'],
    potIncluded: true
  }
];

export const MOCK_PLANTS = PRODUCTS;

export const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

export const getRelatedPlants = (plant: Product, count: number) => {
  return PRODUCTS.filter(p => p.id !== plant.id && p.category === plant.category).slice(0, count);
};

export type OrderStatus = "Pending" | "Approved" | "Paid" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  date: string;
  items: any[];
  total: number;
  status: OrderStatus;
}

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-9921",
    date: "2024-03-15",
    items: [
      { ...PRODUCTS[0], quantity: 1 }
    ],
    total: 1299,
    status: "Delivered"
  }
];

export const MOCK_USER = {
  name: "Jane Doe",
  email: "jane@example.com",
  role: "User",
  affiliateStatus: "None"
};
