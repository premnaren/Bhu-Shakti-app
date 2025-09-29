
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase-client';
import FarmhandPage from '@/components/FarmhandPage';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // The root page (`/`) is now the single source of truth for redirecting unauthenticated users.
        // The dashboard's role is simply to wait for an authenticated user.
        // If after a reasonable time there's still no user, we can assume they need to log in.
        // A timeout handles edge cases where the auth state takes unusually long.
        const timer = setTimeout(() => {
             if (!auth.currentUser) {
                router.replace('/auth');
             }
        }, 2000); // Wait 2 seconds before redirecting

        return () => clearTimeout(timer);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <LoadingSpinner text="Loading Dashboard..." />;
  }

  // FarmhandPage now handles the case where the user object might be briefly null
  return <FarmhandPage />;
}
