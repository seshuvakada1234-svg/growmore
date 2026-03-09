'use client';

import { useAuth, useFirestore } from '@/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ADMIN_EMAIL = 'seshuvakada1234@gmail.com';

export function GoogleLoginButton() {

  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  /* ---------------------------------------------
     HANDLE REDIRECT LOGIN RESULT
  --------------------------------------------- */

  useEffect(() => {

    const checkRedirect = async () => {

      if (!auth || !db) return;

      try {

        const result = await getRedirectResult(auth);

        if (result?.user) {
          setIsLoading(true);
          await setupUser(result.user);
        }

      } catch (error: any) {

        if (error.code !== 'auth/no-auth-event') {

          console.error("Redirect error:", error);

          toast({
            title: "Authentication Failed",
            description: error.message,
            variant: "destructive"
          });

        }

      } finally {
        setIsLoading(false);
      }

    };

    checkRedirect();

  }, [auth]);


  /* ---------------------------------------------
     USER PROFILE SETUP
  --------------------------------------------- */

  const setupUser = async (user: any) => {

    if (!db) {
      console.error("Firestore not ready");
      return;
    }

    try {

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      const isAdmin = user.email === ADMIN_EMAIL;

      const names = user.displayName?.split(" ") || [];

      if (!userSnap.exists()) {

        await setDoc(userRef, {

          id: user.uid,
          email: user.email,

          firstName: names[0] || "",
          lastName: names.slice(1).join(" ") || "",

          phone: user.phoneNumber || "",

          role: isAdmin ? "admin" : "user",

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()

        });

      }

      /* ---------------------------------------
         ADMIN ROLE COLLECTION
      --------------------------------------- */

      if (isAdmin) {

        const adminRef = doc(db, "roles_admin", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {

          await setDoc(adminRef, {
            id: user.uid,
            assignedAt: serverTimestamp(),
            isMasterAdmin: true
          });

        }

      }

      toast({
        title: "Welcome to Monterra!",
        description: `Signed in as ${user.displayName}`
      });

      router.replace("/");

    } catch (error: any) {

      console.error("USER SETUP ERROR:", error);

      toast({
        title: "Setup Failed",
        description: error.message || "Could not create user profile.",
        variant: "destructive"
      });

    }

  };


  /* ---------------------------------------------
     GOOGLE SIGN IN
  --------------------------------------------- */

  const handleGoogleSignIn = async () => {

    if (!auth) return;

    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account"
    });

    setIsLoading(true);

    try {

      const result = await signInWithPopup(auth, provider);

      await setupUser(result.user);

    } catch (error: any) {

      if (error.code === "auth/popup-blocked") {

        toast({
          title: "Popup blocked",
          description: "Switching to redirect login..."
        });

        await signInWithRedirect(auth, provider);

      }

      else if (
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request"
      ) {

        setIsLoading(false);

      }

      else {

        console.error("Login error:", error);

        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });

        setIsLoading(false);

      }

    }

  };


  /* ---------------------------------------------
     MANUAL REDIRECT LOGIN
  --------------------------------------------- */

  const handleManualRedirect = async () => {

    if (!auth) return;

    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account"
    });

    setIsLoading(true);

    await signInWithRedirect(auth, provider);

  };


  /* ---------------------------------------------
     UI
  --------------------------------------------- */

  return (

    <div className="space-y-4 w-full">

      <div className="flex flex-col gap-3">

        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          variant="outline"
          className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl font-bold border-2 shadow-sm"
        >

          {isLoading ? (

            <Loader2 className="h-5 w-5 animate-spin" />

          ) : (

            <svg width="20" height="20" viewBox="0 0 24 24">

              <path fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04
                2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74
                3.28-8.09z"/>

              <path fill="#34A853"
                d="M12 23c2.97 0 5.46-.98
                7.28-2.66l-3.57-2.77c-.98.66-2.23
                1.06-3.71 1.06-2.86
                0-5.29-1.93-6.16-4.53H2.18v2.84
                C3.99 20.53 7.7 23 12 23z"/>

              <path fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09
                s.13-1.43.35-2.09V7.07H2.18C1.43
                8.55 1 10.22 1 12s.43 3.45
                1.18 4.93l2.85-2.22.81-.62z"/>

              <path fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56
                4.21 1.64l3.15-3.15C17.45
                2.09 14.97 1 12 1
                7.7 1 3.99 3.47
                2.18 7.07l3.66 2.84c.87-2.6
                3.3-4.53 6.16-4.53z"/>

            </svg>

          )}

          Continue with Google

        </Button>

        {!isLoading && (

          <button
            onClick={handleManualRedirect}
            className="text-[10px] text-muted-foreground uppercase font-black flex items-center justify-center gap-1"
          >

            Problems signing in? Try redirect
            <ExternalLink className="h-3 w-3" />

          </button>

        )}

      </div>

      {!isLoading && (

        <div className="flex items-start gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs border">

          <AlertCircle className="h-4 w-4 mt-0.5" />

          <p>

            If your browser blocks popups, use the redirect login option.

          </p>

        </div>

      )}

    </div>

  );

}