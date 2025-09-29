
'use client';
import { useEffect, useState } from 'react';
import DataGrid from '@/components/DataGrid';
import { Icons } from '@/components/icons';
import { getAppId, getFirebaseAuth } from '@/lib/firebase-client';
import LoadingSpinner from './LoadingSpinner';
import SettingsSheet from './SettingsSheet';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from './ui/sidebar';
import { Card, CardHeader, CardTitle } from './ui/card';
import DashboardPage from './DashboardPage';
import MyFarmPage from './MyFarmPage';
import AdvisoryPage from './AdvisoryPage';
import { User as FirebaseAuthUser, onAuthStateChanged } from 'firebase/auth';
import { useLanguage } from '@/contexts/language-context';
import WelcomeDialog from './WelcomeDialog';
import MarketPage from './MarketPage';
import ChatPage, { Message } from './ChatPage';

const getInitialSimulatedUser = (authUser: FirebaseAuthUser) => ({
    uid: authUser.uid,
    displayName: authUser.displayName || 'New Farmer',
    bio: 'Loves all things agriculture.',
    photoURL: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/200/200`,
    phoneNumber: authUser.phoneNumber || '',
    email: authUser.email || '',
    village: 'Valuthur',
    district: '', // Initially empty to trigger welcome dialog
    state: 'Tamil Nadu',
    landNumber: 'SN-45/B',
    farmProfile: {
        totalArea: '33 Acres',
        soilType: 'loam',
    }
});

type Section = 'home' | 'diagnose-problem' | 'dashboard' | 'my-farm' | 'advisory' | 'resources' | 'market' | 'sustainability';

const SectionPlaceholder = ({ title }: { title: string }) => (
    <Card className="flex items-center justify-center h-96">
        <CardHeader>
            <CardTitle className="text-2xl text-muted-foreground">{title} - Under Procession</CardTitle>
        </CardHeader>
    </Card>
);

export default function FarmhandPage() {
    const [authUser, setAuthUser] = useState<FirebaseAuthUser | null>(null);
    const [appId, setAppId] = useState<string>('');
    const { t } = useLanguage();
    const [user, setUser] = useState<any | null>(null);
    const [activeSection, setActiveSection] = useState<Section>('home');
    const [loading, setLoading] = useState(true);
    const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);


    useEffect(() => {
        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setAuthUser(firebaseUser);
                // Only set the simulated user if it hasn't been set before,
                // or if the UID changes. This preserves user edits from the settings panel.
                if (!user || user.uid !== firebaseUser.uid) {
                    setUser(getInitialSimulatedUser(firebaseUser));
                }

                // Check if the profile is complete.
                // We use localStorage to persist this check across sessions.
                const isProfileComplete = localStorage.getItem(`bhu-shakti-profile-complete-${firebaseUser.uid}`);
                if (!isProfileComplete) {
                  // If the district is missing from our user state, show the dialog.
                  // We check the 'user' state because it might have been updated from a previous session.
                  const simulatedUser = user || getInitialSimulatedUser(firebaseUser);
                  if(!simulatedUser.district) {
                    setIsWelcomeDialogOpen(true);
                  }
                }
                 setLoading(false);
            } else {
                setAuthUser(null);
                setUser(null);
                // The main router at src/app/page.tsx will handle redirecting to /auth
            }
        });

        if (typeof window !== 'undefined') {
            try {
                setAppId(getAppId());
            } catch(e) {
                console.error(e);
            }
        }

        return () => unsubscribe();
    }, [user])

    if (loading || !user) {
        return <LoadingSpinner text={t('initializingBhuShakti')} />;
    }

    const sections = [
        { id: 'home', icon: <Icons.home />, label: t('conversations') },
        { id: 'diagnose-problem', icon: <Icons.solution />, label: t('diagnoseProblem') },
        { id: 'dashboard', icon: <Icons.dashboard />, label: t('dashboard') },
        { id: 'my-farm', icon: <Icons.tractor />, label: t('myFarm') },
        { id: 'advisory', icon: <Icons.insights />, label: t('advisoryInsights') },
        { id: 'resources', icon: <Icons.resources />, label: t('resourcesSupport') },
        { id: 'market', icon: <Icons.market />, label: t('marketInsights') },
        { id: 'sustainability', icon: <Icons.sustainability />, label: t('sustainabilityHub') },
    ] as const;

    const renderContent = () => {
        switch (activeSection) {
            case 'home':
                return (
                    <div className="w-full max-w-3xl mx-auto h-[calc(100vh-10rem)]">
                      <ChatPage messages={messages} setMessages={setMessages}/>
                    </div>
                );
            case 'diagnose-problem':
                return (
                     <div className="w-full max-w-3xl mx-auto">
                        {appId ? (
                            <DataGrid user={user} appId={appId} />
                        ) : (
                            <div className="text-center text-muted-foreground">{t('couldNotLoadAppData')}</div>
                        )}
                    </div>
                );
            case 'dashboard':
                return <DashboardPage user={user} setActiveSection={setActiveSection} />;
            case 'my-farm':
                return <MyFarmPage user={user} setUser={setUser} />;
            case 'advisory':
                return <AdvisoryPage user={user} appId={appId} />;
             case 'market':
                return <MarketPage user={user} />;
            case 'resources':
                return <SectionPlaceholder title={t('resourcesSupport')} />;
            case 'sustainability':
                return <SectionPlaceholder title={t('sustainabilityHub')} />;
            default:
                return null;
        }
    }

    return (
        <>
            <WelcomeDialog open={isWelcomeDialogOpen} onOpenChange={setIsWelcomeDialogOpen} user={user} setUser={setUser} />
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <Icons.logo className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl font-bold text-foreground font-headline">
                            Bhu-Shakti
                        </h1>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {sections.map(section => (
                             <SidebarMenuItem key={section.id}>
                                <SidebarMenuButton 
                                    onClick={() => setActiveSection(section.id as Section)} 
                                    isActive={activeSection === section.id}
                                    tooltip={section.label}
                                >
                                    {section.icon}
                                    <span>{section.label}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SettingsSheet user={user} setUser={setUser} />
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <div className="flex flex-col min-h-screen bg-background">
                    <header className="w-full border-b">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center gap-4">
                                   <SidebarTrigger className="md:hidden"/>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background">
                        {renderContent()}
                    </main>
                    <footer className="py-4 text-center text-xs text-muted-foreground border-t">
                        Bhu-Shakti &copy; {new Date().getFullYear()}
                    </footer>
                </div>
            </SidebarInset>
        </>
    );
}
