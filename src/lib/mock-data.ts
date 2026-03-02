
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
  rating: number;
  reviewsCount: number;
  stock: number;
  isBestseller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  careLevel?: 'easy' | 'moderate' | 'hard';
}

export const CATEGORIES: Category[] = ["Indoor", "Outdoor", "Seeds", "Bonsai"];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Monstera Deliciosa",
    category: "Indoor",
    price: 1299,
    oldPrice: 1599,
    description: "The Monstera Deliciosa, also known as the Swiss Cheese Plant, is a stunning tropical plant famous for its large, heart-shaped leaves with unique natural holes (fenestrations).",
    careGuide: "Keep in bright, indirect light. Water when the top inch of soil is dry. Mist leaves occasionally.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-monstera")?.imageUrl || "",
    rating: 4.8,
    reviewsCount: 124,
    stock: 15,
    isBestseller: true,
    isFeatured: true,
    careLevel: 'moderate'
  },
  {
    id: "2",
    name: "Snake Plant Zeylanica",
    category: "Indoor",
    price: 499,
    oldPrice: 699,
    description: "Snake Plants are architectural marvels that thrive on neglect. They are excellent air purifiers and can tolerate low light conditions.",
    careGuide: "Low to bright light. Water every 2-3 weeks. Do not overwater.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-snake")?.imageUrl || "",
    rating: 4.9,
    reviewsCount: 89,
    stock: 20,
    isNew: true,
    isFeatured: true,
    careLevel: 'easy'
  },
  {
    id: "3",
    name: "Fiddle Leaf Fig",
    category: "Indoor",
    price: 2499,
    description: "The Fiddle Leaf Fig is the ultimate statement piece for any modern home. Its broad, violin-shaped leaves create a dramatic aesthetic.",
    careGuide: "Bright indirect light is essential. Water only when top soil is dry. Rotate occasionally.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-fiddle")?.imageUrl || "",
    rating: 4.5,
    reviewsCount: 56,
    stock: 8,
    isFeatured: true,
    careLevel: 'hard'
  },
  {
    id: "4",
    name: "Japanese Juniper Bonsai",
    category: "Bonsai",
    price: 3200,
    oldPrice: 3800,
    description: "A meticulously pruned Juniper bonsai that represents peace and patience. Perfect for a desk or side table.",
    careGuide: "Needs bright sunlight. Water daily to keep soil moist but not soggy. Prune to maintain shape.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-bonsai")?.imageUrl || "",
    rating: 4.7,
    reviewsCount: 34,
    stock: 5,
    isBestseller: true,
    careLevel: 'moderate'
  },
  {
    id: "5",
    name: "English Lavender",
    category: "Outdoor",
    price: 299,
    description: "Fragrant, beautiful, and hardy. This lavender is perfect for sunny gardens or patio pots.",
    careGuide: "Full sun is a must. Well-draining soil. Minimal water once established.",
    imageUrl: PlaceHolderImages.find(img => img.id === "plant-lavender")?.imageUrl || "",
    rating: 4.6,
    reviewsCount: 78,
    stock: 45,
    isNew: true,
    careLevel: 'easy'
  }
];

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = "Pending" | "Approved" | "Paid" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
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
  },
  {
    id: "ORD-9922",
    date: "2024-03-20",
    items: [
      { ...PRODUCTS[1], quantity: 2 }
    ],
    total: 998,
    status: "Pending"
  }
];

export type AffiliateStatus = "None" | "Pending" | "Approved";

export interface UserProfile {
  name: string;
  email: string;
  role: "User" | "Admin";
  affiliateStatus: AffiliateStatus;
  earnings?: {
    total: number;
    pending: number;
    paid: number;
    referrals: number;
  };
}

export const MOCK_USER: UserProfile = {
  name: "Jane Doe",
  email: "jane@example.com",
  role: "User",
  affiliateStatus: "None"
};
