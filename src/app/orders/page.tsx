
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MOCK_ORDERS } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/shared/StatusChip";
import { Package, ChevronRight, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function OrdersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-neutral/30 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-headline font-extrabold text-primary mb-10">Your Orders</h1>

          {MOCK_ORDERS.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm">
              <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-bold">No orders yet</h2>
              <p className="text-muted-foreground mt-2">When you order something, it will appear here.</p>
              <Link href="/plants">
                <button className="mt-6 font-bold text-primary hover:underline">Start shopping</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {MOCK_ORDERS.map((order) => (
                <Card key={order.id} className="rounded-3xl border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardHeader className="bg-accent/50 border-b flex flex-row items-center justify-between p-6">
                    <div className="flex gap-8">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Order ID</p>
                        <p className="font-bold text-primary">{order.id}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Date</p>
                        <div className="flex items-center gap-1 font-bold text-primary">
                          <Calendar className="h-4 w-4" /> {order.date}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Total</p>
                        <p className="font-bold text-primary">₹{order.total}</p>
                      </div>
                    </div>
                    <StatusChip status={order.status} />
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                          </div>
                          <div className="flex-grow">
                            <h4 className="font-headline font-bold text-lg">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">{item.category} • Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <Link href={`/plants/${item.id}`}>
                              <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                                Buy again <ArrowUpRight className="h-4 w-4" />
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 flex justify-end gap-3">
                      <button className="text-sm font-bold px-6 py-2 rounded-full border border-muted hover:bg-muted transition-colors">Track Order</button>
                      <button className="text-sm font-bold px-6 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors">Order Details</button>
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
