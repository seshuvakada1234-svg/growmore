"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, FileText, Loader2, User as UserIcon, Download, ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

function invoiceTypeMeta(order: any) {
  if (order.finalInvoiceUrl)     return { label: "Final",     cls: "bg-emerald-100 text-emerald-700" };
  if (order.cancelledInvoiceUrl) return { label: "Cancelled", cls: "bg-red-100 text-red-700"         };
  if (order.proformaInvoiceUrl)  return { label: "Proforma",  cls: "bg-gray-100 text-gray-700"       };
  return null;
}

function resolveInvoiceUrl(order: any): string | null {
  return order.finalInvoiceUrl || order.cancelledInvoiceUrl || order.proformaInvoiceUrl || null;
}

function timeAgo(order: any): string {
  const ts = order.updatedAt || order.createdAt;
  if (!ts?.seconds) return "-";
  return formatDistanceToNow(new Date(ts.seconds * 1000), { addSuffix: true });
}

export default function AdminInvoices() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");

  const userProfileRef = useMemoFirebase(
    () => (!user?.uid ? null : doc(db, "users", user.uid)),
    [db, user?.uid],
  );
  const { data: profile } = useDoc(userProfileRef);
  const isAdmin =
    profile?.role === "admin" ||
    user?.email === "seshuvakada1234@gmail.com";

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return query(collection(db, "orders"), orderBy("createdAt", "desc"));
  }, [db, isAdmin]);

  const { data: allOrders, isLoading } = useCollection(ordersQuery);

  const invoiceOrders = (allOrders || []).filter(
    (o) => o.finalInvoiceUrl || o.cancelledInvoiceUrl || o.proformaInvoiceUrl,
  );

  const filtered = invoiceOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isAdmin && profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground italic">
        Restricted access...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-extrabold text-primary">Invoices</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Total Invoices: <span className="font-bold text-primary">{invoiceOrders.length}</span></span>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name or email..."
            className="pl-10 rounded-xl h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading || !profile ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Order ID</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Invoice Type</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider">Generated</TableHead>
                  <TableHead className="p-6 font-bold text-xs uppercase tracking-wider text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const meta       = invoiceTypeMeta(order);
                  const invoiceUrl = resolveInvoiceUrl(order);
                  const amount     = order.totalAmount || order.total || 0;

                  return (
                    <TableRow key={order.id} className="hover:bg-accent/30 transition-all border-b border-muted">
                      <TableCell className="p-6 font-bold text-primary font-mono text-sm">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </TableCell>

                      <TableCell className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary flex-shrink-0">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-none">{order.customerName || "Guest"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{order.customerEmail}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-6 font-bold text-primary">
                        ₹{amount.toLocaleString("en-IN")}
                      </TableCell>

                      <TableCell className="p-6">
                        <span className={`inline-flex text-xs font-bold px-3 py-1 rounded-full ${
                          order.status === "Delivered" ? "bg-emerald-100 text-emerald-700"
                          : order.status === "Cancelled" ? "bg-red-100 text-red-700"
                          : order.status === "Approved"  ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                        }`}>
                          {order.status}
                        </span>
                      </TableCell>

                      <TableCell className="p-6">
                        {meta ? (
                          <Badge className={`${meta.cls} hover:opacity-90 border-none font-bold`}>
                            {meta.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="p-6 text-sm text-muted-foreground">
                        {timeAgo(order)}
                      </TableCell>

                      <TableCell className="p-6 text-right">
                        {invoiceUrl ? (
                          <a
                            href={invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unavailable</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-20 text-center text-muted-foreground">
                      {searchTerm ? "No invoices match your search." : "No invoices generated yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}