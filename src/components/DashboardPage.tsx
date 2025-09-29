import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Icons } from './icons';
import Image from 'next/image';
import { getWeather, WeatherData } from '@/ai/tools/farm-tools';
import { format } from 'date-fns';
import { enUS, hi, te } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useLanguage } from '@/contexts/language-context';

interface User {
  displayName: string;
  photoURL: string;
  district: string;
}

interface DashboardPageProps {
  user: User;
  setActiveSection: (section: 'home' | 'dashboard' | 'my-farm' | 'advisory' | 'resources' | 'sustainability') => void;
}

const locales: Record<string, Locale> = {
    en: enUS,
    hi: hi,
    te: te,
};

export default function DashboardPage({ user, setActiveSection }: DashboardPageProps) {
    const [weatherForecast, setWeatherForecast] = React.useState<WeatherData | null>(null);
    const [weatherLoading, setWeatherLoading] = React.useState(true);
    const { t, language } = useLanguage();
    const currentLocale = locales[language] || enUS;

    const cropData = [
        { name: 'Tomato', image: 'https://images.unsplash.com/photo-1565195093469-82a4a4d00ed7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHx0b21hdG8lMjBwbGFudHxlbnwwfHx8fDE3NTg0NzU4MDR8MA&ixlib=rb-4.1.0&q=80&w=1080', dataAiHint: 'tomato plant', stage: 'Flowering', health: 'Good', healthVariant: 'default' },
        { name: 'Corn', image: 'https://images.unsplash.com/photo-1504788576473-fa4b594356a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8Y29ybiUyMGZpZWxkfGVufDB8fHx8MTc1ODQ3NTgwNHww&ixlib=rb-4.1.0&q=80&w=1080', dataAiHint: 'corn field', stage: 'Vegetative', health: 'Needs Attention', healthVariant: 'destructive' },
        { name: 'Wheat', image: 'https://images.unsplash.com/photo-1542547856-6a2768c7b580?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHx3aGVhdCUyMGZpZWxkfGVufDB8fHx8MTc1ODQ3NTgwNHww&ixlib=rb-4.1.0&q=80&w=1080', dataAiHint: 'wheat field', stage: 'Maturing', health: 'Good', healthVariant: 'default' },
    ];

    const advisoryData = [
        { 
            icon: <Icons.solution />, 
            title: t('irrigation'), 
            description: t('irrigationDescription'),
            details: t('irrigationDetails'),
            variant: 'secondary' 
        },
        { 
            icon: <Icons.tractor />, 
            title: t('fertilizer'), 
            description: t('fertilizerDescription'),
            details: t('fertilizerDetails'),
            variant: 'secondary' 
        },
        { 
            icon: <Icons.logo />, 
            title: t('pestManagement'), 
            description: t('pestManagementDescription'),
            details: t('pestManagementDetails'),
            variant: 'destructive' 
        },
    ];

    React.useEffect(() => {
        async function fetchWeather() {
            if (user.district) {
                try {
                    setWeatherLoading(true);
                    const forecast = await getWeather({ city: user.district, days: 7 });
                    setWeatherForecast(forecast);
                } catch (error) {
                    console.error("Failed to fetch weather:", error);
                    setWeatherForecast(null); // Set to null on error to show a message
                } finally {
                    setWeatherLoading(false);
                }
            } else {
                setWeatherLoading(false); // No district, no loading
            }
        }
        fetchWeather();
    }, [user.district]);
    
    const todayWeather = weatherForecast?.[0];

  return (
    <div className="space-y-8 animate-in fade-in-50">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">
                {t('usersWelcome', { name: user.displayName })}
            </h1>
            <Avatar className="h-12 w-12">
                <AvatarImage src={user.photoURL} alt={user.displayName} />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
        </div>

        <div className="grid gap-6">
            {/* At-a-Glance Summary */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>{t('atAGlance')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Icons.thermometer className="h-8 w-8 text-primary" />
                        {weatherLoading ? (
                             <div className="space-y-1">
                                <Skeleton className="h-4 w-20"/>
                                <Skeleton className="h-6 w-28"/>
                             </div>
                        ) : todayWeather ? (
                            <div>
                                <p className="text-sm text-muted-foreground">{t('weather')}</p>
                                <p className="text-xl font-bold">{todayWeather.temperature}°C, {t(todayWeather.condition.replace(/\s/g, '').toLowerCase())}</p>
                            </div>
                        ) : (
                             <div>
                                <p className="text-sm text-muted-foreground">{t('weather')}</p>
                                <p className="text-sm font-semibold">{t('setLocationForForecast')}</p>
                            </div>
                        )}
                    </div>
                     <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                        <Icons.alert className="h-8 w-8 text-destructive" />
                        <div>
                            <p className="text-sm text-destructive">{t('criticalAlert')}</p>
                            <p className="font-semibold">{t('powderyMildewDetected')}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Icons.solution className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">{t('nextAction')}</p>
                            <p className="font-semibold">{t('irrigateFieldA')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        {/* Crop Overview */}
        <div>
            <h2 className="text-2xl font-bold mb-4">{t('cropOverview')}</h2>
            <div className="grid gap-6 md:grid-cols-3">
                {cropData.map(crop => (
                    <Card key={crop.name} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                        <div className="relative h-40 w-full">
                            <Image src={crop.image} alt={crop.name} fill={true} className="object-cover" data-ai-hint={crop.dataAiHint}/>
                        </div>
                        <CardContent className="p-4">
                            <h3 className="text-lg font-bold">{t(crop.name.toLowerCase())}</h3>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-sm text-muted-foreground">{t(crop.stage.toLowerCase())}</p>
                                <Badge variant={crop.healthVariant as any}>{t(crop.health.replace(' ', '').toLowerCase())}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        {/* Advisory & Weather */}
         <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
                {/* Advisory Cards */}
                <div>
                     <h2 className="text-2xl font-bold mb-4">{t('todaysAdvisories')}</h2>
                     <Accordion type="single" collapsible className="w-full space-y-4">
                        {advisoryData.map((advisory, index) => (
                            <AccordionItem value={`item-${index}`} key={index} className={`border-l-4 shadow-md rounded-md bg-card ${advisory.variant === 'destructive' ? 'border-destructive' : 'border-primary'}`}>
                                <AccordionTrigger className="p-4 flex items-center gap-4 hover:no-underline">
                                    <div className="flex items-center gap-4 flex-1 text-left">
                                        <div className={`p-2 rounded-full ${advisory.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                                            {React.cloneElement(advisory.icon, { className: `h-6 w-6 ${advisory.variant === 'destructive' ? 'text-destructive' : 'text-primary'}`})}
                                        </div>
                                        <div>
                                            <h3 className="font-bold">{advisory.title}</h3>
                                            <p className="text-sm text-muted-foreground">{advisory.description}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <p className="text-sm text-muted-foreground pl-14">{advisory.details}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                     </Accordion>
                </div>
            </div>

            {/* Weather Forecast */}
            <div>
                <h2 className="text-2xl font-bold mb-4">{t('sevenDayForecast')}</h2>
                <Card className="shadow-lg">
                    <CardContent className="p-4 space-y-2">
                        {weatherLoading && (
                            Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="flex justify-between items-center p-2">
                                    <Skeleton className="h-5 w-12" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            ))
                        )}
                        {!weatherLoading && !weatherForecast && (
                            <div className="text-center text-muted-foreground p-4">
                                {t('setLocationForForecast')}
                            </div>
                        )}
                        {weatherForecast?.map(day => (
                            <div key={day.date} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                                <p className="font-semibold">{format(new Date(day.date), 'EEE', { locale: currentLocale })}</p>

                                <div className="flex items-center gap-2">
                                     <Icons.thermometer className='h-5 w-5 text-muted-foreground' />
                                    <span className="font-medium">{day.temperature}°C</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
         </div>
    </div>
  );
}
