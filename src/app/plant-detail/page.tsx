
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import PlantDetailClient from "./components/PlantDetailClient";

export default function PlantDetailPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<div className="container mx-auto p-12 text-center">Loading plant details...</div>}>
          <PlantDetailClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
