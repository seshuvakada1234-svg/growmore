
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusChip } from "@/components/shared/StatusChip";
import { Package, Calendar, ArrowUpRight, Loader2, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format } from "date-fns";

export default function OrdersPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  // Fetch real orders from Firestore for the current user
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: orders, isLoading: isOrdersLoading } = useCollection(ordersQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/orders');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isOrdersLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-neutral/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-headline font-extrabold text-primary">Your Orders</h1>
              <p className="text-muted-foreground mt-1">Manage and track your plant purchases.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                placeholder="Search orders..." 
                className="pl-10 h-10 w-full md:w-64 rounded-full border-none bg-white shadow-sm text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {!orders || orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-muted">
              <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-primary">No orders found</h2>
              <p className="text-muted-foreground mt-2">When you order something, it will appear here.</p>
              <Link href="/plants">
                <button className="mt-6 bg-primary text-white px-8 py-2.5 rounded-full font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Start Shopping
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order: any) => (
                <Card key={order.id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group">
                  <CardHeader className="bg-accent/30 border-b flex flex-row items-center justify-between p-6">
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">Order ID</p>
                        <p className="font-bold text-primary text-xs sm:text-sm font-mono">{order.id.substring(0, 12)}...</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">Date</p>
                        <div className="flex items-center gap-1 font-bold text-primary text-sm">
                          <Calendar className="h-3.5 w-3.5" /> 
                          {order.createdAt?.seconds 
                            ? format(new Date(order.createdAt.seconds * 1000), "MMM d, yyyy") 
                            : "Recent"}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">Total</p>
                        <p className="font-bold text-primary text-sm">₹{(order.totalAmount || order.total || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <StatusChip status={order.status || "Pending"} />
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6">
                      {(order.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border">
                            <Image 
                              src={item.imageUrl || "https://picsum.photos/seed/plant/200/200"} 
                              alt={item.name} 
                              fill 
                              className="object-cover" 
                            />
                          </div>
                          <div className="flex-grow min-w-0">
                            <h4 className="font-headline font-bold text-base sm:text-lg truncate">{item.name}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">Qty: {item.qty || item.quantity || 1} • ₹{item.price}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <Link href={`/plants/${item.productId || item.id}`}>
                              <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                                Buy again <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end gap-3">
                      <Link href={`/track-order/${order.id}`}>
                        <button className="w-full sm:w-auto text-sm font-bold px-8 py-2.5 rounded-full border-2 border-primary/10 text-primary hover:bg-accent transition-all">
                          Track Order
                        </button>
                      </Link>
                      <button className="w-full sm:w-auto text-sm font-bold px-8 py-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-md">
                        Order Details
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
