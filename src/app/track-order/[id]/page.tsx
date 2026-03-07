
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Box,
  User,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TrackOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  const orderRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, "orders", id as string);
  }, [db, id]);

  const { data: order, isLoading, error } = useDoc(orderRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <Box className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-headline font-bold text-primary">Order Not Found</h1>
          <p className="text-muted-foreground mt-2 text-center max-w-xs">
            We couldn't find the order ID you're looking for. Please check the ID and try again.
          </p>
          <Button onClick={() => router.push('/orders')} className="mt-8 rounded-full px-8">
            Back to My Orders
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Fallback tracking steps if they don't exist in the document
  const defaultSteps = [
    { 
      status: "Order Confirmed", 
      description: "Your order has been successfully placed", 
      time: order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), "iii, d MMM ''yy - h:mma") : "Just now",
      completed: true 
    },
    { 
      status: "Processed", 
      description: "Seller has processed your order and preparing for pickup", 
      time: "Pending",
      completed: ["Approved", "Paid", "Delivered", "Shipped"].includes(order.status)
    },
    { 
      status: "Shipped", 
      description: "Your item has been picked up by our delivery partner", 
      time: "Pending",
      completed: ["Delivered", "Shipped"].includes(order.status)
    },
    { 
      status: "Delivered", 
      description: "Order reached your doorstep", 
      time: "Pending",
      completed: order.status === "Delivered" 
    }
  ];

  const trackingSteps = order.trackingSteps || defaultSteps;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Header />
      
      <main className="flex-grow py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Action */}
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Orders
          </button>

          {/* Header Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Box className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-widest">Tracking Status</span>
              </div>
              <h1 className="text-3xl font-headline font-extrabold text-primary">
                Order #{id?.toString().substring(0, 12).toUpperCase()}
              </h1>
              <p className="text-muted-foreground font-medium">
                Standard Delivery • Expected by {order.expectedDate || "3-5 business days"}
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-border/50">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Courier Partner</p>
                <p className="font-bold text-sm">{order.courier || "BlueDart Logistics"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timeline View */}
            <div className="lg:col-span-2">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 md:p-10">
                <div className="space-y-0">
                  {trackingSteps.map((step: any, index: number) => {
                    const isLast = index === trackingSteps.length - 1;
                    const isCompleted = step.completed;
                    
                    return (
                      <div key={index} className="flex gap-6">
                        {/* Vertical Progress Component */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors",
                            isCompleted ? "bg-primary text-white" : "bg-neutral text-muted-foreground border-2 border-muted"
                          )}>
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3 w-3" />}
                          </div>
                          {!isLast && (
                            <div className={cn(
                              "w-0.5 flex-grow my-1 transition-colors",
                              isCompleted ? "bg-primary" : "bg-neutral border-l-2 border-dashed border-muted"
                            )} style={{ minHeight: '60px' }}></div>
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="pb-8">
                          <h3 className={cn(
                            "font-headline font-bold text-lg leading-tight",
                            isCompleted ? "text-primary" : "text-muted-foreground"
                          )}>
                            {step.status}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            {step.description}
                          </p>
                          <p className={cn(
                            "text-xs font-bold mt-2",
                            isCompleted ? "text-primary/60" : "text-muted-foreground/40"
                          )}>
                            {step.time}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <MapPin className="h-4 w-4" />
                  <h4 className="font-bold text-sm uppercase tracking-wider">Delivery Address</h4>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-primary">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                  </p>
                  <p className="text-xs font-medium text-primary mt-3 flex items-center gap-2">
                    <User className="h-3 w-3" /> {order.customerPhone || "Contact details saved"}
                  </p>
                </div>
              </Card>

              {/* Support Card */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-primary text-white p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-headline font-bold text-lg mb-2">Need Help?</h4>
                  <p className="text-xs text-white/70 mb-4">Our plant experts are available 24/7 to assist with your delivery.</p>
                  <Button variant="outline" className="w-full rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all font-bold gap-2">
                    Contact Support <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                {/* Decorative background leaf */}
                <Box className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
