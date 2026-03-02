
'use client';

import * as LucideIcons from "lucide-react";

const IconMap: Record<string, any> = {
  CheckCircleIcon: LucideIcons.CheckCircle2,
  MagnifyingGlassPlusIcon: LucideIcons.ZoomIn,
  ChevronLeftIcon: LucideIcons.ChevronLeft,
  ChevronRightIcon: LucideIcons.ChevronRight,
  XMarkIcon: LucideIcons.X,
  CheckBadgeIcon: LucideIcons.BadgeCheck,
  StarIcon: LucideIcons.Star,
  HandThumbUpIcon: LucideIcons.ThumbsUp,
  TruckIcon: LucideIcons.Truck,
  ShoppingCartIcon: LucideIcons.ShoppingCart,
  BoltIcon: LucideIcons.Zap,
  HeartIcon: LucideIcons.Heart,
  FunnelIcon: LucideIcons.Filter,
  ChevronDownIcon: LucideIcons.ChevronDown,
  ChevronUpIcon: LucideIcons.ChevronUp,
  CheckIcon: LucideIcons.Check,
  ArrowRightIcon: LucideIcons.ArrowRight,
  Squares2X2Icon: LucideIcons.LayoutGrid,
  ListBulletIcon: LucideIcons.List,
  MagnifyingGlassIcon: LucideIcons.Search,
};

interface AppIconProps {
  name: string;
  size?: number;
  className?: string;
  variant?: 'outline' | 'solid';
}

export default function AppIcon({ name, size = 24, className, variant = 'outline' }: AppIconProps) {
  const IconComponent = IconMap[name] || LucideIcons.HelpCircle;
  return (
    <IconComponent 
      size={size} 
      className={className} 
      fill={variant === 'solid' ? 'currentColor' : 'none'} 
    />
  );
}
