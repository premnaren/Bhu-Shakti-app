'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Icons } from "./icons";
import Image from "next/image";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from './ui/dialog';
import { useForm, Controller } from 'react-hook-form';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface User {
    displayName: string;
    photoURL: string;
    district: string;
    state: string;
    farmProfile?: {
        totalArea: string;
        soilType: string;
    }
}

interface MyFarmPageProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const initialFieldsData = [
    { 
        id: "F01", name: "North Field", area: "10 Acres", crop: "Corn", soilMoisture: 72, 
        nutrients: { n: 120, p: 55, k: 80 }, ph: 6.8,
        history: [
            { month: "Jan", n: 110, p: 50, k: 75 }, { month: "Feb", n: 115, p: 52, k: 78 },
            { month: "Mar", n: 120, p: 55, k: 80 }, { month: "Apr", n: 118, p: 53, k: 82 },
        ]
    },
    { 
        id: "F02", name: "West Valley", area: "15 Acres", crop: "Soybean", soilMoisture: 65,
        nutrients: { n: 80, p: 70, k: 90 }, ph: 6.5,
        history: [
            { month: "Jan", n: 85, p: 68, k: 88 }, { month: "Feb", n: 82, p: 70, k: 90 },
            { month: "Mar", n: 80, p: 72, k: 91 }, { month: "Apr", n: 78, p: 70, k: 89 },
        ]
    },
    { 
        id: "F03", name: "South Ridge", area: "8 Acres", crop: "Wheat", soilMoisture: 58,
        nutrients: { n: 150, p: 60, k: 100 }, ph: 7.1,
        history: [
            { month: "Jan", n: 145, p: 58, k: 95 }, { month: "Feb", n: 148, p: 60, k: 98 },
            { month: "Mar", n: 150, p: 62, k: 100 }, { month: "Apr", n: 152, p: 61, k: 102 },
        ]
    },
];

const initialCropsData = [
    { name: 'Corn', image: 'https://images.unsplash.com/photo-1504788576473-fa4b594356a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8Y29ybiUyMGZpZWxkfGVufDB8fHx8MTc1ODQ3NTgwNHww&lib=rb-4.1.0&q=80&w=1080', dataAiHint: 'corn field', stage: 'Vegetative', health: 'Good', sowingDate: '2024-04-15', expectedHarvest: '2024-08-20' },
    { name: 'Soybean', image: 'https://picsum.photos/seed/soybean/400/300', dataAiHint: 'soybean field', stage: 'Flowering', health: 'Excellent', sowingDate: '2024-05-01', expectedHarvest: '2024-09-10' },
    { name: 'Wheat', image: 'https://images.unsplash.com/photo-1542547856-6a2768c7b580?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHx3aGVhdCUyMGZpZWxkfGVufDB8fHx8MTc1ODQ3NTgwNHww&lib=rb-4.1.0&q=80&w=1080', dataAiHint: 'wheat field', stage: 'Maturing', health: 'Needs Attention', sowingDate: '2023-11-20', expectedHarvest: '2024-04-05' },
];

const initialSensorsData = [
    { id: "SEN-001", type: "Soil Moisture", field: "North Field (F01)", status: "Online", reading: "72%", lastReading: "Just now" },
    { id: "SEN-002", type: "Temperature", field: "North Field (F01)", status: "Online", reading: "28°C", lastReading: "2 minutes ago" },
    { id: "SEN-003", type: "Soil pH", field: "West Valley (F02)", status: "Online", reading: "6.8 pH", lastReading: "5 minutes ago" },
    { id: "SEN-004", type: "Weather Station", field: "Main Farmhouse", status: "Offline", reading: "N/A", lastReading: "2 hours ago" },
]

const chartConfig = {
  n: { label: "N", color: "hsl(var(--chart-1))" },
  p: { label: "P", color: "hsl(var(--chart-2))" },
  k: { label: "K", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

const NutrientProgress = ({ label, value, max }: { label: string, value: number, max: number }) => (
    <div className='space-y-1'>
        <div className="flex justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            <span>{value} ppm</span>
        </div>
        <Progress value={(value/max) * 100} className="h-2" />
    </div>
);


export default function MyFarmPage({ user, setUser }: MyFarmPageProps) {
  const [fields, setFields] = useState(initialFieldsData);
  const [crops, setCrops] = useState(initialCropsData);
  const [sensors, setSensors] = useState(initialSensorsData);
  
  const [aiRecommendation, setAiRecommendation] = useState<Record<string, string | null>>({});

  const { register, handleSubmit, reset, control } = useForm();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [farmProfile, setFarmProfile] = useState({
      totalArea: user.farmProfile?.totalArea || '33 Acres',
      soilType: user.farmProfile?.soilType || 'loam',
  });

  useEffect(() => {
    if (user.farmProfile) {
        setFarmProfile({
            totalArea: user.farmProfile.totalArea || '33 Acres',
            soilType: user.farmProfile.soilType || 'loam',
        });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setFarmProfile(prev => ({ ...prev, [id]: value }));
  }

  const handleSoilTypeChange = (value: string) => {
      setFarmProfile(prev => ({ ...prev, soilType: value }));
  }

  const handleProfileSave = () => {
    setUser((prevUser: any) => ({
      ...prevUser,
      farmProfile: { ...farmProfile }
    }));
    toast({
      title: t('profileSaved'),
      description: t('profileSavedDescription'),
    });
  }
  
  const onFieldSubmit = (data: any) => {
    const newField = {
      id: `F${(fields.length + 1).toString().padStart(2, '0')}`,
      name: data.fieldName,
      area: `${data.fieldArea} Acres`,
      crop: data.fieldCrop,
      soilMoisture: 0,
      nutrients: { n: 100, p: 50, k: 75 },
      ph: 7.0,
      history: [],
    };
    setFields(prev => [...prev, newField]);
    reset();
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
  }

  const onCropSubmit = (data: any) => {
    const newCrop = {
        name: data.cropName,
        stage: data.cropStage,
        health: 'Good',
        sowingDate: new Date().toISOString().split('T')[0],
        expectedHarvest: '',
        image: `https://picsum.photos/seed/${data.cropName}/400/300`,
        dataAiHint: `${data.cropName.toLowerCase()} field`,
    };
    setCrops(prev => [...prev, newCrop]);
    reset();
  }

  const deleteCrop = (name: string) => {
    setCrops(prev => prev.filter(crop => crop.name !== name));
  }

  const onSensorSubmit = (data: any) => {
      const newSensor = {
        id: `SEN-${(sensors.length + 1).toString().padStart(3, '0')}`,
        type: data.sensorType,
        field: data.sensorField,
        status: "Online",
        reading: "N/A",
        lastReading: "Just now",
      };
      setSensors(prev => [...prev, newSensor]);
      reset();
  };

  const deleteSensor = (id: string) => {
    setSensors(prev => prev.filter(sensor => sensor.id !== id));
  }

  const getAIRecommendation = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    setAiRecommendation(prev => ({ ...prev, [fieldId]: "Analyzing..." }));
    
    setTimeout(() => {
        let recommendation = "Soil appears balanced. Monitor for changes.";
        if (field.nutrients.n < 100) {
            recommendation = `${field.name} shows low Nitrogen. Recommend a micro-dose of 2kg Urea targeted to this area.`;
        } else if (field.ph < 6.5) {
            recommendation = `${field.name} is slightly acidic. Consider applying 5kg of lime to raise pH.`;
        } else if (field.soilMoisture < 60) {
            recommendation = `${field.name} is dry. Schedule irrigation within the next 24 hours.`;
        }
        setAiRecommendation(prev => ({...prev, [fieldId]: recommendation}));
    }, 1500);
  }

  return (
    <div className="animate-in fade-in-50">
        <h1 className="text-3xl font-bold text-foreground mb-6">{t('myFarm')}</h1>
        <Tabs defaultValue="profile" className="w-full">
             <ScrollArea className="w-full whitespace-nowrap mb-6">
                <TabsList className="inline-flex">
                    <TabsTrigger value="profile"><Icons.home className="mr-2"/>{t('farmProfile')}</TabsTrigger>
                    <TabsTrigger value="fields"><Icons.map className="mr-2"/>{t('fieldManagement')}</TabsTrigger>
                    <TabsTrigger value="crops"><Icons.sprout className="mr-2"/>{t('cropManagement')}</TabsTrigger>
                    <TabsTrigger value="soil-intel"><Icons.sustainability className="mr-2" />Soil Intel</TabsTrigger>
                    <TabsTrigger value="sensors"><Icons.satellite className="mr-2"/>{t('sensorsDevices')}</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('farmProfile')}</CardTitle>
                        <CardDescription>{t('farmProfileDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={user.photoURL} alt={user.displayName} />
                                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1.5">
                                <h2 className="text-2xl font-bold">{t('usersFarm', { name: user.displayName })}</h2>
                                <p className="text-muted-foreground">{user.district}, {user.state}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="farm-location">{t('location')}</Label>
                                <Input id="farm-location" defaultValue={`${user.district}, ${user.state}`} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalArea">{t('totalArea')}</Label>
                                <Input id="totalArea" value={farmProfile.totalArea} onChange={handleProfileChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="soilType">{t('dominantSoilType')}</Label>
                                <Select value={farmProfile.soilType} onValueChange={handleSoilTypeChange}>
                                    <SelectTrigger id="soilType">
                                        <SelectValue placeholder={t('selectSoilType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sandy">{t('sandy')}</SelectItem>
                                        <SelectItem value="clay">{t('clay')}</SelectItem>
                                        <SelectItem value="silt">{t('silt')}</SelectItem>
                                        <SelectItem value="loam">{t('loam')}</SelectItem>
                                        <SelectItem value="peaty">{t('peaty')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleProfileSave}>{t('saveChanges')}</Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="fields">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                 <div className="space-y-1.5">
                                    <CardTitle>{t('fields')}</CardTitle>
                                    <CardDescription>{t('registeredFields')}</CardDescription>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">{t('manage')}</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[625px]">
                                        <DialogHeader>
                                            <DialogTitle>{t('manageFields')}</DialogTitle>
                                            <DialogDescription>{t('manageFieldsDescription')}</DialogDescription>
                                        </DialogHeader>
                                         <form onSubmit={handleSubmit(onFieldSubmit)}>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="fieldName" className="text-right">{t('name')}</Label>
                                                    <Input id="fieldName" {...register("fieldName", { required: true })} className="col-span-3" />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="fieldArea" className="text-right">{t('areaAcres')}</Label>
                                                    <Input id="fieldArea" type="number" {...register("fieldArea", { required: true })} className="col-span-3" />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="fieldCrop" className="text-right">{t('crop')}</Label>
                                                    <Input id="fieldCrop" {...register("fieldCrop", { required: true })} className="col-span-3" />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button type="submit"><Icons.plusCircle className="mr-2 h-4 w-4" />{t('addField')}</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {fields.map(field => (
                                    <div key={field.id} className="group relative">
                                        <Button variant="ghost" className="w-full justify-start h-auto p-3">
                                            <div className="flex flex-col items-start text-left">
                                                <p className="font-bold">{t(field.name.replace(' ', '').toLowerCase())} ({field.id})</p>
                                                <p className="text-sm text-muted-foreground">{field.area} - {t(field.crop.toLowerCase())}</p>
                                            </div>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteField(field.id)}>
                                            <Icons.x className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-2">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>{t('fieldDetails')}: {t('northfield')} (F01)</CardTitle>
                                <CardDescription>{t('showingDataForSelectedField')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative w-full aspect-[4/2] rounded-lg overflow-hidden border">
                                    <Image src="https://picsum.photos/seed/field-map/800/400" alt="Field Map" fill={true} data-ai-hint="satellite farmland map" className="object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <p className="text-white font-bold text-lg">[{t('interactiveMapPlaceholder')}]</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-muted-foreground">{t('soilMoisture')}</p>
                                        <p className="text-xl font-bold">72%</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-muted-foreground">{t('avgTemperature')}</p>
                                        <p className="text-xl font-bold">28°C</p>
                                    </div>
                                </div>
                                <Button><Icons.satellite className="mr-2"/>{t('viewSatelliteImagery')}</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            
            <TabsContent value="crops">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1.5">
                            <CardTitle>{t('cropManagement')}</CardTitle>
                            <CardDescription>{t('cropManagementDescription')}</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">{t('manage')}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                    <DialogTitle>{t('manageCrops')}</DialogTitle>
                                    <DialogDescription>{t('manageCropsDescription')}</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit(onCropSubmit)}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="cropName" className="text-right">{t('name')}</Label>
                                            <Input id="cropName" {...register("cropName", { required: true })} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="cropStage" className="text-right">{t('stage')}</Label>
                                            <Controller
                                                name="cropStage"
                                                control={control}
                                                rules={{ required: true }}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder={t('selectAStage')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Germination">{t('germination')}</SelectItem>
                                                            <SelectItem value="Vegetative">{t('vegetative')}</SelectItem>
                                                            <SelectItem value="Flowering">{t('flowering')}</SelectItem>
                                                            <SelectItem value="Fruiting">{t('fruiting')}</SelectItem>
                                                            <SelectItem value="Maturing">{t('maturing')}</SelectItem>
                                                            <SelectItem value="Harvested">{t('harvested')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="submit"><Icons.plusCircle className="mr-2 h-4 w-4" />{t('addCrop')}</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {crops.map((crop) => (
                                <Card key={crop.name} className="flex flex-col group relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 z-10" onClick={() => deleteCrop(crop.name)}>
                                        <Icons.x className="h-4 w-4 text-destructive"/>
                                    </Button>
                                    <CardHeader>
                                        <div className="relative h-40 w-full mb-4">
                                            <Image src={crop.image} alt={crop.name} fill={true} className="object-cover rounded-md" data-ai-hint={crop.dataAiHint}/>
                                        </div>
                                        <CardTitle>{t(crop.name.toLowerCase())}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={crop.health === "Good" || crop.health === "Excellent" ? "default" : "destructive"}>{t(crop.health.replace(' ', '').toLowerCase())}</Badge>
                                            <Badge variant="secondary">{t(crop.stage.toLowerCase())}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-grow">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">{t('growthTimeline')}</Label>
                                            <Progress value={60} className="h-2 mt-1" />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>{t('sown')}: {crop.sowingDate}</span>
                                                <span>{t('harvest')}: {crop.expectedHarvest}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t pt-4">
                                        <Button className="w-full">{t('logActivity')}</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="soil-intel">
                <Card>
                    <CardHeader>
                        <CardTitle>Soil &amp; Water Intelligence</CardTitle>
                        <CardDescription>Micro-level analysis of your farm's soil health.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {fields.map(field => (
                            <Card key={field.id} className="overflow-hidden">
                                <CardHeader>
                                    <CardTitle>{t(field.name.replace(' ', '').toLowerCase())} ({field.id})</CardTitle>
                                    <CardDescription>{field.area} - {field.crop}</CardDescription>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                        <h4 className="font-semibold">Nutrient Levels (ppm)</h4>
                                        <NutrientProgress label="Nitrogen (N)" value={field.nutrients.n} max={200} />
                                        <NutrientProgress label="Phosphorus (P)" value={field.nutrients.p} max={100} />
                                        <NutrientProgress label="Potassium (K)" value={field.nutrients.k} max={150} />
                                        <div className="flex items-center justify-between pt-2">
                                            <h4 className='font-semibold'>Soil pH</h4>
                                            <Badge variant={field.ph < 6.0 || field.ph > 7.5 ? 'destructive' : 'default'}>{field.ph}</Badge>
                                        </div>
                                    </div>
                                    <div className='space-y-4'>
                                        <Button onClick={() => getAIRecommendation(field.id)} className="w-full">
                                            <Icons.solution className="mr-2"/> Get AI Recommendation
                                        </Button>
                                        {aiRecommendation[field.id] && (
                                            <Alert>
                                                <Icons.logo className="h-4 w-4"/>
                                                <AlertTitle>AI Recommendation</AlertTitle>
                                                <AlertDescription>
                                                {aiRecommendation[field.id] === 'Analyzing...' ? 
                                                    <span className="flex items-center gap-2"><Icons.spinner className="animate-spin"/> Analyzing data...</span> :
                                                    aiRecommendation[field.id]
                                                }
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <Card>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-base">Historical Nutrient Trends</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <ChartContainer config={chartConfig} className="w-full h-[150px]">
                                                    <AreaChart data={field.history} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <Area dataKey="n" type="natural" fill="var(--color-n)" fillOpacity={0.4} stroke="var(--color-n)" />
                                                        <Area dataKey="p" type="natural" fill="var(--color-p)" fillOpacity={0.4} stroke="var(--color-p)" />
                                                        <Area dataKey="k" type="natural" fill="var(--color-k)" fillOpacity={0.4} stroke="var(--color-k)" />
                                                    </AreaChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="sensors">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1.5">
                            <CardTitle>{t('sensorsDevices')}</CardTitle>
                            <CardDescription>{t('sensorsDevicesDescription')}</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">{t('manage')}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                    <DialogTitle>{t('manageDevices')}</DialogTitle>
                                    <DialogDescription>{t('manageDevicesDescription')}</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit(onSensorSubmit)}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="sensorType" className="text-right">{t('type')}</Label>
                                            <Input id="sensorType" {...register("sensorType", { required: true })} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="sensorField" className="text-right">{t('field')}</Label>
                                            <Controller
                                                name="sensorField"
                                                control={control}
                                                rules={{ required: true }}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder={t('selectAField')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {fields.map(f => <SelectItem key={f.id} value={`${f.name} (${f.id})`}>{t(f.name.replace(' ', '').toLowerCase())} ({f.id})</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="submit"><Icons.plusCircle className="mr-2 h-4 w-4" />{t('addDevice')}</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border">
                            {sensors.map((sensor) => (
                                <div key={sensor.id} className="grid grid-cols-5 items-center py-3 group relative">
                                    <div className="col-span-2">
                                        <p className="font-bold">{sensor.id}</p>
                                        <p className="text-sm text-muted-foreground">{t(sensor.type.replace(' ', '').toLowerCase())}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t(sensor.field.split(' ')[0].toLowerCase())} ({sensor.field.split(' ')[1]})</p>
                                    </div>
                                    <div>
                                        <Badge variant={sensor.status === 'Online' ? 'default' : 'destructive'}>{t(sensor.status.toLowerCase() as 'online' | 'offline')}</Badge>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono">{sensor.reading}</p>
                                        <p className="text-xs text-muted-foreground">{t(sensor.lastReading.replace(/\s/g, '').toLowerCase())}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteSensor(sensor.id)}>
                                        <Icons.x className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
