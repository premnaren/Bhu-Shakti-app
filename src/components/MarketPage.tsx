
'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { Icons } from "./icons";
import { useLanguage } from '@/contexts/language-context';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { getMarketPrices } from '@/ai/tools/farm-tools';
import { useToast } from '@/hooks/use-toast';

interface User {
  district: string;
  state: string;
}

interface MarketPageProps {
  user: User;
}

const initialCrops = ['Tomato', 'Corn', 'Wheat', 'Soybean', 'Cotton'];

export default function MarketPage({ user }: MarketPageProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [selectedCrop, setSelectedCrop] = React.useState(initialCrops[0]);
    const [marketData, setMarketData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        const fetchMarketData = async () => {
            if (!user.district || !user.state) {
                setLoading(false);
                setMarketData([]);
                return;
            }
            setLoading(true);
            try {
                const data = await getMarketPrices({
                    cropName: selectedCrop,
                    district: user.district,
                    state: user.state,
                });
                setMarketData(data);
            } catch (error) {
                console.error("Failed to fetch market data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error Fetching Prices',
                    description: 'Could not load market data. Please try again later.'
                });
                setMarketData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMarketData();
    }, [selectedCrop, user.district, user.state, toast]);

    const bestMarket = marketData.length > 0 ? marketData[0] : null;

    const TrendIcon = ({ trend }: { trend: 'Up' | 'Down' | 'Stable' }) => {
        if (trend === 'Up') return <TrendingUp className="h-5 w-5 text-green-500" />;
        if (trend === 'Down') return <TrendingDown className="h-5 w-5 text-destructive" />;
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    };

    const DemandBadge = ({ demand }: { demand: 'High' | 'Medium' | 'Low' }) => {
         const variant = demand === 'High' ? 'default' : demand === 'Medium' ? 'secondary' : 'outline';
         return <Badge variant={variant}>{t(demand.toLowerCase() as 'high'|'medium'|'low')}</Badge>
    }

  return (
    <div className="space-y-6 animate-in fade-in-50">
        <h1 className="text-3xl font-bold text-foreground">{t('marketInsights')}</h1>
        
        <Card>
            <CardHeader>
                <CardTitle>{t('marketInsights')}</CardTitle>
                <CardDescription>
                    Simulated market data for demonstration purposes. Prices are not live.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="max-w-xs">
                    <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('selectCrop')} />
                        </SelectTrigger>
                        <SelectContent>
                            {initialCrops.map(crop => (
                                <SelectItem key={crop} value={crop}>{t(crop.toLowerCase())}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {!user.district || !user.state ? (
                     <Alert variant="default" className="bg-secondary">
                        <Icons.info className="h-4 w-4" />
                        <AlertTitle>{t('setLocationForInsights')}</AlertTitle>
                        <AlertDescription>
                            {t('noMarketData')}
                        </AlertDescription>
                    </Alert>
                ) : loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                             <Card>
                                <CardHeader>
                                    <CardTitle>{t('nearbyMarkets')} {t(selectedCrop.toLowerCase())}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('mandi')}</TableHead>
                                                <TableHead className="text-right">{t('pricePerQuintal')}</TableHead>
                                                <TableHead className="text-center">{t('demand')}</TableHead>
                                                <TableHead className="text-center">{t('trend')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {marketData.map(market => (
                                                <TableRow key={market.name}>
                                                    <TableCell className="font-medium">{market.name}</TableCell>
                                                    <TableCell className="text-right font-mono">₹{market.price.toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="text-center"><DemandBadge demand={market.demand}/></TableCell>
                                                    <TableCell className="text-center"><TrendIcon trend={market.trend} /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        {bestMarket && (
                            <div className="space-y-4">
                                <Card className="bg-primary/5 border-primary">
                                     <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                        <Icons.market className="h-8 w-8 text-primary"/>
                                        <CardTitle className="text-lg">{t('bestMarket')}</CardTitle>
                                     </CardHeader>
                                     <CardContent>
                                        <p className="text-2xl font-bold">{bestMarket.name}</p>
                                        <p className="text-sm text-muted-foreground">{t('highestPriceAt')} ₹{bestMarket.price.toLocaleString('en-IN')}</p>
                                     </CardContent>
                                </Card>
                                 <Alert>
                                    <Icons.solution className="h-4 w-4" />
                                    <AlertTitle className="font-semibold">{t('profittaking')}</AlertTitle>
                                    <AlertDescription>
                                        {t('considerSelling')} <strong>{bestMarket.name}</strong> {t('forMaxProfit')}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
