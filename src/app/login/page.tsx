'use client';

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Leaf } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { doc } from "firebase/firestore";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    // If the user is already authenticated and profile is loaded, redirect based on role
    if (!isUserLoading && user && !isProfileLoading && profile) {
      if (profile.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [user, isUserLoading, profile, isProfileLoading, router]);

  if (isUserLoading || (user && isProfileLoading) || (user && profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral/30">
        <div className="animate-pulse text-primary font-bold flex flex-col items-center gap-4">
          <Leaf className="h-12 w-12 animate-bounce" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center bg-neutral/30 py-12 px-4">
        <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center text-primary">
                <Leaf className="h-10 w-10 fill-current" />
              </div>
            </div>
            <CardTitle className="text-3xl font-headline font-extrabold text-primary">Welcome Back</CardTitle>
            <CardDescription className="text-lg">Sign in to manage your garden</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12 space-y-6">
            <GoogleLoginButton />
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              By continuing, you agree to GreenScape's <br />
              <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}