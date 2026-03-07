import { Timestamp } from "firebase/firestore";

export type MonterraUserRole = "user" | "affiliate" | "admin";

export interface MonterraUser {
  uid: string;
  role: MonterraUserRole;
  affiliateApproved: boolean; // only admin can set to true
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export interface MonterraProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  affiliateCommission: number; // percentage e.g. 5
  image: string;
  description: string;
  createdAt: Timestamp;
}

export interface AffiliateLinkRecord {
  id?: string;
  userId: string;
  originalUrl: string;
  affiliateUrl: string;
  createdAt: Timestamp;
  clicks: number;
  status: "active" | "suspended";
}

export interface AffiliateClickRecord {
  id?: string;
  referrerId: string;
  landingPage: string;
  productSlug: string;
  timestamp: Timestamp;
}

export interface AffiliateCommissionRecord {
  id?: string;
  affiliateId: string;
  productId: string;
  orderId: string;
  orderValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: Timestamp;
}

export type SharePlatform = "whatsapp" | "telegram" | "facebook" | "instagram" | "copy";
