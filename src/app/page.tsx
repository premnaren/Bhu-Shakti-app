
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase-client';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in, redirect to dashboard
          router.replace('/dashboard');
        } else {
          // User is signed out, redirect to auth page
          router.replace('/auth');
        }
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (e) {
      // If Firebase init fails, we can't check auth state.
      // Redirect to auth page as a fallback.
      console.error(e);
      router.replace('/auth');
    }
  }, [router]);

  return <LoadingSpinner text="Loading..." />;
}
