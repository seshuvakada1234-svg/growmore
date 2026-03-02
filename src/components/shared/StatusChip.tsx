
import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: OrderStatus;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const variants: Record<OrderStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    Approved: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    Paid: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    Delivered: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    Cancelled: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
  };

  return (
    <Badge className={cn("rounded-full px-3 py-1 font-semibold", variants[status], className)} variant="outline">
      {status}
    </Badge>
  );
}
