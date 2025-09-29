
'use client';
import * as React from 'react';
import { collection, onSnapshot, query, orderBy, DocumentData } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from './ui/badge';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { Icons } from './icons';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getWeather, WeatherData } from '@/ai/tools/farm-tools';
import { format } from 'date-fns';
import { enUS, hi, te } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { getProactiveAdvisory, ProactiveAdvisoryOutput } from '@/ai/flows/get-proactive-advisory-flow';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useLanguage } from '@/contexts/language-context';

interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  district: string;
   farmProfile?: {
    totalArea: string;
    soilType: string;
  }
}

interface Crop {
    name: string;
    stage: string;
}

interface AdvisoryPageProps {
  user: User;
  appId: string;
}

const yieldChartData = [
  { crop: "Corn", predicted: 180, lastYear: 175, color: "hsl(var(--chart-1))" },
  { crop: "Soybean", predicted: 120, lastYear: 125, color: "hsl(var(--chart-2))" },
  { crop: "Wheat", predicted: 90, lastYear: 100, color: "hsl(var(--chart-3))" },
]

const initialCropsData = [
    { name: 'Corn', stage: 'Vegetative'},
    { name: 'Soybean', stage: 'Flowering'},
    { name: 'Wheat', stage: 'Maturing'},
];


const locales: Record<string, Locale> = {
    en: enUS,
    hi: hi,
    te: te,
};


export default function AdvisoryPage({ user, appId }: AdvisoryPageProps) {
    const [weatherForecast, setWeatherForecast] = React.useState<WeatherData | null>(null);
    const [weatherLoading, setWeatherLoading] = React.useState(true);
    const [advisoryHistory, setAdvisoryHistory] = React.useState<DocumentData[]>([]);
    const [historyLoading, setHistoryLoading] = React.useState(true);
    const [advisory, setAdvisory] = React.useState<ProactiveAdvisoryOutput | null>(null);
    const [advisoryLoading, setAdvisoryLoading] = React.useState(true);
    const [crops] = React.useState<Crop[]>(initialCropsData);
    const { toast } = useToast();
    const { t, language } = useLanguage();
    const currentLocale = locales[language] || enUS;


    const yieldChartConfig = {
        predicted: { label: t('predictedYield'), color: "hsl(var(--chart-1))" },
        lastYear: { label: t('lastYearsYield'), color: "hsl(var(--chart-2))" },
    }

    const handleGetNewAdvisory = React.useCallback(async (showLoading = true) => {
        if(showLoading) setAdvisoryLoading(true);
        try {
            const newAdvisory = await getProactiveAdvisory({ 
                location: user.district, 
                language,
                crops: crops.map(c => c.name),
                soilType: user.farmProfile?.soilType || 'loam',
            });
            setAdvisory(newAdvisory);
        } catch (error) {
            console.error("Failed to get new advisory:", error);
            toast({
                variant: "destructive",
                title: t('failedToGetAdvisory'),
                description: t('failedToGetAdvisoryDescription'),
            });
        } finally {
            if(showLoading) setAdvisoryLoading(false);
        }
    }, [user.district, language, crops, user.farmProfile?.soilType, toast, t]);
    
    React.useEffect(() => {
        if (user.district) {
            handleGetNewAdvisory(true).finally(() => setAdvisoryLoading(false));
        } else {
            setAdvisoryLoading(false);
            setAdvisory(null);
        }
    }, [user.district, handleGetNewAdvisory]);

    React.useEffect(() => {
        async function fetchWeather() {
            if (user.district) {
                try {
                    setWeatherLoading(true);
                    const forecast = await getWeather({ city: user.district, days: 7 });
                    setWeatherForecast(forecast);
                } catch (error) {
                    console.error("Failed to fetch weather:", error);
                    setWeatherForecast(null);
                } finally {
                    setWeatherLoading(false);
                }
            } else {
                setWeatherLoading(false);
                setWeatherForecast(null);
            }
        }
        fetchWeather();
    }, [user.district]);
    
    React.useEffect(() => {
        const db = getFirebaseFirestore();
        if (db && user?.uid && appId) {
            const collectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/diagnoses`);
            const q = query(collectionRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAdvisoryHistory(items);
                setHistoryLoading(false);
            }, (error) => {
                console.error("Error fetching advisory history:", error);
                setHistoryLoading(false);
            });

            return () => unsubscribe();
        } else {
            setHistoryLoading(false);
        }
    }, [user?.uid, appId]);

    const potentialRisks = [
        { title: t('heatStress'), condition: weatherForecast && weatherForecast[1] && weatherForecast[1].temperature > 35, description: t('heatStressDescription'), icon: <Icons.thermometer className="text-destructive"/>, level: 'Medium' },
        { title: t('highHumidityPestRisk'), condition: weatherForecast && weatherForecast[2] && weatherForecast[2].humidity > 80, description: t('highHumidityPestRiskDescription'), icon: <Icons.sprout className="text-amber-500"/>, level: 'Medium' },
        { title: t('strongWindAdvisory'), condition: weatherForecast && weatherForecast[3] && weatherForecast[3].windSpeed > 25, description: t('strongWindAdvisoryDescription'), icon: <Icons.wind className="text-blue-500"/>, level: 'Low' },
    ].filter(risk => risk.condition);

  return (
    <div className="animate-in fade-in-50 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">{t('advisoryInsights')}</h1>
        <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="insights"><Icons.solution className="mr-2"/>{t('currentDetailedInsights')}</TabsTrigger>
                <TabsTrigger value="history"><Icons.history className="mr-2"/>{t('advisoryHistory')}</TabsTrigger>
                <TabsTrigger value="predictive"><Icons.insights className="mr-2"/>{t('predictiveAnalytics')}</TabsTrigger>
            </TabsList>

            <TabsContent value="insights">
                <Card className="shadow-lg relative min-h-[500px]">
                     {(advisoryLoading && user.district) && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-xl">
                            <div className="flex items-center gap-2 bg-card p-4 rounded-lg border shadow-lg">
                                <Icons.spinner className="animate-spin h-5 w-5" />
                                <span className="text-muted-foreground">{t('generatingNewAdvisory')}</span>
                            </div>
                        </div>
                    )}
                    {!user.district && !advisoryLoading && (
                        <div className="p-6">
                            <Alert variant="default" className="bg-secondary">
                                <Icons.info className="h-4 w-4" />
                                <AlertTitle>{t('setLocationForInsights')}</AlertTitle>
                                <AlertDescription>
                                    {t('setLocationForInsightsDescription')}
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    {advisory && !advisoryLoading && (
                        <>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-2xl">{advisory.title}</CardTitle>
                                        <CardDescription>{t('generatedOn')} {format(new Date(), 'PPP', { locale: currentLocale })} {t('for')} {user.district}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleGetNewAdvisory()} disabled={advisoryLoading}>
                                            <Icons.refresh className="mr-2 h-4 w-4" />
                                            {t('getNewAdvisory')}
                                        </Button>
                                        <Badge variant={advisory.urgency === 'High' ? 'destructive' : 'default'} className="text-base">{t(advisory.urgency.toLowerCase() as 'high' | 'medium' | 'low')}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-3 gap-6">
                                     <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                                        <Icons.alert className="h-8 w-8 text-primary"/>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('riskProbability')}</p>
                                            <p className="text-2xl font-bold">{advisory.riskProbability}%</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                                        <Icons.logo className="h-8 w-8 text-primary"/>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('identifiedRisk')}</p>
                                            <p className="text-lg font-bold">{advisory.pestOrDisease}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                                        <Icons.sprout className="h-8 w-8 text-primary"/>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('affectedCrop')}</p>
                                            <p className="text-lg font-bold">{advisory.affectedCrop}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator/>
                                
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-lg mb-2">{t('impactAnalysis')}</h3>
                                            <p className="text-sm text-muted-foreground">{advisory.impactAnalysis}</p>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-2">{t('preventiveAction')}</h3>
                                            <Alert>
                                                <Icons.solution className="h-4 w-4" />
                                                <AlertTitle className="font-semibold">{t('recommendation')}</AlertTitle>
                                                <AlertDescription>
                                                    {advisory.preventiveAction}
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                    </div>

                                    <div className="relative aspect-video rounded-md overflow-hidden border">
                                        <Image 
                                            key={advisory.imageHint}
                                            src={`https://picsum.photos/seed/${advisory.pestOrDisease.replace(/\s/g, '')}/800/600`} 
                                            alt={advisory.pestOrDisease}
                                            fill={true} 
                                            className="object-cover" 
                                            data-ai-hint={advisory.imageHint} 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        <p className="absolute bottom-2 left-3 text-white text-sm font-semibold">{t('risk')}: {advisory.pestOrDisease}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </TabsContent>

            <TabsContent value="history">
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>{t('advisoryHistory')}</CardTitle>
                        <CardDescription>{t('advisoryHistoryDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {historyLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : advisoryHistory.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">{t('noAdvisoryHistory')}</p>
                        ) : (
                            <div className="relative pl-6">
                                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2"></div>
                                <div className="space-y-8">
                                    {advisoryHistory.map((item) => (
                                        <div key={item.id} className="relative">
                                            <div className="absolute -left-2.5 top-1.5 h-5 w-5 rounded-full bg-primary border-4 border-background -translate-x-1/2"></div>
                                            <div className="pl-8">
                                                <p className="text-sm font-semibold text-primary">
                                                    {item.createdAt ? format(item.createdAt.toDate(), 'PPP', { locale: currentLocale }) : t('justNow')}
                                                </p>
                                                <p className="font-semibold mt-1">{item.solution?.recommendation}</p>
                                                <p className="text-sm text-muted-foreground">{item.problemDescription}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="predictive">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>{t('potentialRisks')}</CardTitle>
                                <CardDescription>{t('basedOn7DayForecast')} {user.district}.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {weatherLoading && <Skeleton className="h-24 w-full" />}
                                {!weatherLoading && !user.district && <p className="text-sm text-muted-foreground">{t('setLocationForForecast')}</p>}
                                {!weatherLoading && user.district && potentialRisks.length === 0 && <p className="text-sm text-muted-foreground">{t('noSignificantRisks')}</p>}
                                {potentialRisks.map(risk => (
                                    <div key={risk.title} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                                        <div className="p-2 bg-background rounded-full">{risk.icon}</div>
                                        <div>
                                            <p className="font-semibold">{risk.title}</p>
                                            <p className="text-sm text-muted-foreground">{risk.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                     <div className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>{t('yieldPrediction')}</CardTitle>
                                <CardDescription>{t('yieldPredictionDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <ChartContainer config={yieldChartConfig} className="w-full h-[250px]">
                                    <BarChart accessibilityLayer data={yieldChartData}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="crop" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => t(value.toLowerCase())} />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="lastYear" fill="var(--color-lastYear)" radius={4} />
                                        <Bar dataKey="predicted" fill="var(--color-predicted)" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
