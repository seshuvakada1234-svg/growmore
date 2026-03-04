
'use client';

import { useAuth, useFirestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ADMIN_EMAIL = 'seshuvakada1234@gmail.com';

/**
 * Enhanced Google Login Button that handles popup blockers and redirects.
 */
export function GoogleLoginButton() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Handle returning from a redirect (necessary if popup was blocked)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setIsLoading(true);
          await handleUserSetup(result.user);
        }
      } catch (error: any) {
        // auth/no-auth-event is normal on page load without a redirect
        if (error.code !== 'auth/no-auth-event') {
          toast({
            title: "Authentication Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    handleRedirectResult();
  }, [auth, db]);

  const handleUserSetup = async (user: any) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const role = user.email === ADMIN_EMAIL ? 'admin' : 'user';
        const names = user.displayName?.split(' ') || [];
        
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          phone: user.phoneNumber || '',
          role: role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (role === 'admin') {
          const roleAdminRef = doc(db, 'roles_admin', user.uid);
          await setDoc(roleAdminRef, {
            id: user.uid,
            assignedAt: serverTimestamp(),
            isMasterAdmin: true
          });
        }
      } else {
        if (user.email === ADMIN_EMAIL) {
          if (userSnap.data()?.role !== 'admin') {
            await updateDoc(userRef, { 
              role: 'admin',
              updatedAt: serverTimestamp()
            });
          }

          const roleAdminRef = doc(db, 'roles_admin', user.uid);
          const roleSnap = await getDoc(roleAdminRef);
          if (!roleSnap.exists()) {
            await setDoc(roleAdminRef, {
              id: user.uid,
              assignedAt: serverTimestamp(),
              isMasterAdmin: true
            });
          }
        }
      }

      toast({
        title: "Welcome to Monterra!",
        description: `Successfully signed in as ${user.displayName}`,
      });
      
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: "Your account was authenticated, but we couldn't set up your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    setIsLoading(true);
    
    try {
      // First attempt: Popup
      const result = await signInWithPopup(auth, provider);
      await handleUserSetup(result.user);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Your browser blocked the sign-in window. Switching to direct redirect...",
        });
        // Automatic fallback to redirect
        await signInWithRedirect(auth, provider);
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User cancelled, just reset state
        setIsLoading(false);
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "An unexpected error occurred during sign in.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
  };

  const handleManualRedirect = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setIsLoading(true);
    await signInWithRedirect(auth, provider);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-3">
        <Button 
          onClick={handleGoogleSignIn} 
          disabled={isLoading}
          variant="outline"
          className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl font-bold border-2 shadow-sm transition-all active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continue with Google
        </Button>
        
        {!isLoading && (
          <button 
            onClick={handleManualRedirect}
            className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center justify-center gap-1.5 hover:text-primary transition-colors py-1"
          >
            Problems signing in? Try direct redirect <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {!isLoading && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 text-emerald-800 rounded-[1.5rem] text-[11px] font-medium border border-emerald-100">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
          <p className="leading-relaxed">
            Browser popup blockers can prevent sign-in windows. If the window doesn't open, look for a blocked popup icon in your address bar or use the <strong>direct redirect</strong> option above.
          </p>
        </div>
      )}
    </div>
  );
}
