'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Area, AreaChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { format } from 'date-fns';

interface ChartData {
    title: string;
    description: string;
    chartType: 'bar' | 'line' | 'pie' | 'area';
    data: { name: string; value: number }[];
}

interface ChatMessageChartProps {
    chartData: ChartData;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ChatMessageChart({ chartData }: ChatMessageChartProps) {
    if (!chartData) return null;

    const chartConfig = {
        value: {
            label: "Value",
            color: "hsl(var(--chart-1))",
        },
    }
    
    const formattedData = chartData.data.map(item => {
        // Check if name is a valid date string before formatting
        const date = new Date(item.name);
        if (!isNaN(date.getTime()) && item.name.includes('-')) {
            return { ...item, name: format(date, 'EEE') };
        }
        return item;
    });

    const renderChart = () => {
        switch (chartData.chartType) {
            case 'pie':
                return (
                    <ChartContainer config={chartConfig} className="w-full h-[250px]">
                        <PieChart>
                            <ChartTooltip 
                                content={<ChartTooltipContent 
                                    formatter={(value, name) => [`${value}`, name]}
                                />}
                            />
                            <Pie data={formattedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {formattedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                );
             case 'area':
                return (
                     <ChartContainer config={chartConfig} className="w-full h-[200px]">
                        <AreaChart accessibilityLayer data={formattedData} margin={{ left: 10, right: 10 }}>
                             <CartesianGrid vertical={false} />
                             <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                             <YAxis tickLine={false} axisLine={false} tickMargin={10} unit="°C" />
                             <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                             <Area dataKey="value" type="natural" fill="var(--color-value)" fillOpacity={0.4} stroke="var(--color-value)" />
                        </AreaChart>
                     </ChartContainer>
                )
            case 'bar':
            default:
                return (
                    <ChartContainer config={chartConfig} className="w-full h-[200px]">
                        <BarChart accessibilityLayer data={formattedData} margin={{ left: 10, right: 10 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis 
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                unit="°C"
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent 
                                    labelKey='name'
                                    formatter={(value, name, props) => (
                                        <div className="flex flex-col gap-0.5">
                                            <div className="font-semibold">{props.payload.name}</div>
                                            <div className="text-sm text-muted-foreground">Temp: {value}°C</div>
                                        </div>
                                    )}
                                />}
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--color-value)"
                                radius={4}
                            />
                        </BarChart>
                    </ChartContainer>
                );
        }
    };

    return (
        <Card className="max-w-md w-full shadow-lg">
            <CardHeader>
                <CardTitle>{chartData.title}</CardTitle>
                <CardDescription>{chartData.description}</CardDescription>
            </CardHeader>
            <CardContent>
                {renderChart()}
            </CardContent>
        </Card>
    );
}
