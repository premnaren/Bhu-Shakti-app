import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Head from 'next/head';
import { PwaIcons } from '@/components/pwa-icons';
import { SidebarProvider } from '@/components/ui/sidebar';
import { LanguageProvider } from '@/contexts/language-context';


export const metadata: Metadata = {
  title: 'Bhu-Shakti',
  description: 'AI-powered solutions for agriculture.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <head>
        <PwaIcons />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <Script id="firebase-config" strategy="beforeInteractive">
          {`
            (function() {
              if (typeof window !== 'undefined') {
                const searchParams = new URLSearchParams(window.location.search);
                const config = searchParams.get('firebaseConfig');
                const appId = searchParams.get('appId');
                const initialAuthToken = searchParams.get('initialAuthToken');

                if (config) {
                  try {
                    window.__firebase_config = JSON.parse(atob(config));
                  } catch (e) {
                    console.error('Could not parse Firebase config:', e);
                  }
                } else {
                  // Fallback for local development
                  window.__firebase_config = {
                    "projectId": "studio-4386742460-8f5c9",
                    "appId": "1:645911422544:web:9fb53f31166d68db0b9355",
                    "apiKey": "AIzaSyBstzPyBKSggpvqig2s81egRXLCtlU397Y",
                    "authDomain": "studio-4386742460-8f5c9.firebaseapp.com",
                    "storageBucket": "studio-4386742460-8f5c9.appspot.com",
                    "messagingSenderId": "645911422544"
                  };
                }
                
                if (appId) {
                  window.__app_id = appId;
                } else {
                  window.__app_id = 'default-app-id';
                }

                if (initialAuthToken) {
                  window.__initial_auth_token = initialAuthToken;
                }
              }
            })();
          `}
        </Script>
      </head>
      <body className="font-body antialiased h-full">
        <LanguageProvider>
          <SidebarProvider>
            {children}
            <Toaster />
          </SidebarProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
