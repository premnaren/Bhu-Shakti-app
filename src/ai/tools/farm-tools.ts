'use server';
/**
 * @fileOverview A collection of tools for the farmhand AI.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { indianStatesAndDistricts } from '@/lib/indian-states-districts';


const GetWeatherInputSchema = z.object({
  city: z.string().describe('The city for which to get the weather.'),
  days: z.number().optional().describe('The number of days to forecast (e.g., 1 for today, 7 for a week). Defaults to 1.'),
});

const GetWeatherOutputSchema = z.array(z.object({
    date: z.string().describe('The date for the weather forecast, in YYYY-MM-DD format.'),
    temperature: z.number().describe('The average temperature in Celsius.'),
    condition: z.string().describe('A brief description of the weather conditions (e.g., "Sunny", "Cloudy").'),
    humidity: z.number().describe('The humidity percentage.'),
    windSpeed: z.number().describe('The wind speed in km/h.'),
})).describe('An array of weather conditions for the requested forecast period.');

export type WeatherData = z.infer<typeof GetWeatherOutputSchema>;

async function getWeatherImplementation({ city, days = 1 }: z.infer<typeof GetWeatherInputSchema>) {
    console.log(`Getting weather for ${city} for ${days} day(s)...`);
    // In a real application, you would call a weather API here.
    // For this prototype, we'll return more realistic mock data.
    
    const conditions = ['Sunny', 'Partly Cloudy', 'Clear Skies', 'Light Rain', 'Thunderstorms', 'Overcast', 'Scattered Showers'];
    const forecast = [];

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        // More varied and realistic mock data
        const mockData = {
            date: date.toISOString().split('T')[0],
            temperature: 25 + Math.floor(Math.random() * 12 - 4), // e.g., 21 to 33
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            humidity: 40 + Math.floor(Math.random() * 50),      // e.g., 40 to 90
            windSpeed: 5 + Math.floor(Math.random() * 20),       // e.g., 5 to 25
        };
        forecast.push(mockData);
    }
    
    return forecast;
}


export const getWeather = ai.defineTool(
  {
    name: 'getWeather',
    description: 'Get the current weather and a multi-day forecast for a specific location.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  getWeatherImplementation
);


export const getSuggestions = ai.defineTool(
    {
        name: 'getSuggestions',
        description: 'Get farming suggestions for a specific topic.',
        inputSchema: z.object({
            topic: z.enum(['pest control', 'crop rotation', 'soil health', 'irrigation', 'harvesting']).describe('The topic for which to get suggestions.'),
        }),
        outputSchema: z.array(z.string()).describe('A list of suggestions.'),
    },
    async ({ topic }) => {
        console.log(`Getting suggestions for ${topic}...`);
        const suggestions: Record<string, string[]> = {
            'pest control': [
                'Introduce beneficial insects like ladybugs to control aphids.',
                'Use neem oil as a natural pesticide.',
                'Practice crop rotation to disrupt pest life cycles.',
            ],
            'crop rotation': [
                'Alternate between legumes (like beans) and heavy feeders (like corn).',
                'Avoid planting crops from the same family in the same spot year after year.',
                'Plant cover crops like clover or rye during the off-season to improve soil.',
            ],
            'soil health': [
                'Add compost to increase organic matter.',
                'Test your soil pH and amend as needed.',
                'Minimize tilling to protect soil structure and microbial life.',
            ],
            'irrigation': [
                'Use drip irrigation to deliver water directly to the plant roots and reduce waste.',
                'Water early in the morning to minimize evaporation.',
                'Mulch around plants to retain soil moisture.',
            ],
            'harvesting': [
                'Harvest during the coolest part of the day, usually early morning, to keep produce fresh.',
                'Check for visual cues of ripeness, such as color, size, and firmness.',
                'Use clean, sharp tools to avoid damaging the plant and the produce.',
                'Handle harvested produce gently to prevent bruising.',
                'Store produce in a cool, shaded, and well-ventilated area immediately after harvesting.'
            ]
        };

        return suggestions[topic] || ['No suggestions available for this topic.'];
    }
);

const VarietyInfoSchema = z.object({
    name: z.string().describe("The specific name of the seed variety."),
    yield: z.string().describe("The typical yield, e.g., '30-35 quintals/acre'."),
    duration: z.string().describe("The time from sowing to harvest, e.g., '110-120 days'."),
    characteristics: z.array(z.string()).describe("A list of key features or traits of this variety."),
});


const SeedInfoSchema = z.object({
    varieties: z.array(VarietyInfoSchema).describe('A list of recommended seed varieties for the crop, with details on each.'),
    sowingSeason: z.string().describe('The optimal sowing season for the crop (e.g., "Kharif (June-July)").'),
    averagePricePerKg: z.number().describe('The approximate average price of the seed per kilogram in local currency.'),
    commonPests: z.array(z.string()).describe('A list of common pests that affect this crop.'),
    commonDiseases: z.array(z.string()).describe('A list of common diseases that affect this crop.'),
});

const SeedInfoErrorSchema = z.object({
    error: z.string().describe('An error message indicating that information for the crop is not available.'),
});

const GetSeedInfoOutputSchema = z.union([SeedInfoSchema, SeedInfoErrorSchema]);


const seedDatabase: Record<string, z.infer<typeof SeedInfoSchema>> = {
    rice: {
        varieties: [
             { name: 'IR-64', yield: '20-25 quintals/acre', duration: '120-130 days', characteristics: ['Good cooking quality', 'Susceptible to blast disease'] },
             { name: 'Sona Masuri', yield: '25-30 quintals/acre', duration: '130-140 days', characteristics: ['Premium fine grain', 'Lower yield but higher market price'] },
             { name: 'Basmati-370', yield: '15-20 quintals/acre', duration: '140-150 days', characteristics: ['Aromatic long grain', 'Requires careful water management'] },
             { name: 'Pusa Basmati-1121', yield: '18-22 quintals/acre', duration: '145-155 days', characteristics: ['World\'s longest rice grain', 'High demand in export markets'] },
        ],
        sowingSeason: 'Kharif (June-July) and Rabi (Nov-Dec)',
        averagePricePerKg: 45,
        commonPests: ['Stem Borer', 'Leaf Folder', 'Brown Plant Hopper'],
        commonDiseases: ['Blast', 'Bacterial Blight', 'Sheath Blight'],
    },
    wheat: {
        varieties: [
            { name: 'HD-2967', yield: '20-22 quintals/acre', duration: '150-155 days', characteristics: ['High yield potential', 'Good resistance to rust'] },
            { name: 'PBW-550', yield: '19-21 quintals/acre', duration: '145-150 days', characteristics: ['Widely adapted', 'Good chapati making quality'] },
            { name: 'WH-1105', yield: '22-24 quintals/acre', duration: '155-160 days', characteristics: ['Excellent yield', 'Requires timely irrigation'] },
        ],
        sowingSeason: 'Rabi (October-December)',
        averagePricePerKg: 30,
        commonPests: ['Aphids', 'Termites'],
        commonDiseases: ['Rust', 'Smut', 'Powdery Mildew'],
    },
    corn: {
        varieties: [
            { name: 'Pioneer 3396', yield: '35-40 quintals/acre', duration: '110-115 days', characteristics: ['High yield hybrid', 'Good drought tolerance', 'Excellent stay-green trait'] },
            { name: 'Syngenta NK30', yield: '30-35 quintals/acre', duration: '105-110 days', characteristics: ['Early maturity', 'Good resistance to stalk rot', 'Suitable for both grain and fodder'] },
            { name: 'DEKALB 900M Gold', yield: '38-42 quintals/acre', duration: '115-120 days', characteristics: ['High shelling percentage', 'Strong plant structure', 'Tolerant to major diseases'] },
        ],
        sowingSeason: 'Kharif (June-July)',
        averagePricePerKg: 250,
        commonPests: ['Fall Armyworm', 'Corn Earworm', 'Stem Borer'],
        commonDiseases: ['Maydis Leaf Blight', 'Common Rust'],
    },
    tomato: {
        varieties: [
            { name: 'Pusa Ruby', yield: '10-12 tons/acre', duration: '60-70 days after transplanting', characteristics: ['Determinate variety', 'Good for processing', 'Early maturing'] },
            { name: 'Arka Rakshak', yield: '35-40 tons/acre', duration: '120-130 days', characteristics: ['High yield hybrid', 'Triple disease resistance (ToLCV, BW, EB)', 'Good shelf life'] },
            { name: 'Heirloom Guntur Sannam', yield: '8-10 tons/acre', duration: '80-90 days', characteristics: ['Spicy and tangy taste', 'Prized for local markets and traditional cooking', 'Lower yield but unique flavor'] },
        ],
        sowingSeason: 'Year-round, with peaks in Jan-Feb, June-July, and Sept-Oct',
        averagePricePerKg: 900,
        commonPests: ['Fruit Borer', 'Whitefly', 'Thrips'],
        commonDiseases: ['Early Blight', 'Late Blight', 'Tomato Mosaic Virus'],
    },
};

export const getSeedInfo = ai.defineTool(
    {
        name: 'getSeedInfo',
        description: 'Get detailed information about seeds for a specific crop, including details on varieties, sowing season, price, pests, and diseases. Can also query for a specific variety within a crop.',
        inputSchema: z.object({
            cropName: z.string().describe('The name of the crop or specific seed variety (e.g., "rice", "wheat", "corn", "IR-64 rice", "Pioneer 3396").'),
        }),
        outputSchema: GetSeedInfoOutputSchema,
    },
    async ({ cropName }) => {
        const query = cropName.toLowerCase();
        
        // Search for a specific variety first
        for (const crop in seedDatabase) {
            const dbCrop = seedDatabase[crop];
            const foundVariety = dbCrop.varieties.find(v => query.includes(v.name.toLowerCase()));
            
            if (foundVariety) {
                // If a specific variety is found, return its details in the standard format
                return {
                    ...dbCrop,
                    varieties: [foundVariety] // Return only the matched variety
                };
            }
        }
        
        // If no specific variety, search for the general crop name
        const cropKey = Object.keys(seedDatabase).find(key => query.includes(key));
        if (cropKey && seedDatabase[cropKey]) {
            return seedDatabase[cropKey];
        }

        return { error: `Information not available for '${cropName}'.` }; 
    }
);


const MarketDataSchema = z.object({
    name: z.string().describe("The name of the market (mandi)."),
    price: z.number().describe("The current price per quintal in INR."),
    demand: z.enum(['High', 'Medium', 'Low']).describe("The current market demand."),
    trend: z.enum(['Up', 'Stable', 'Down']).describe("The recent price trend."),
});

const GetMarketPricesInputSchema = z.object({
  cropName: z.string().describe("The name of the crop."),
  district: z.string().describe("The user's district."),
  state: z.string().describe("The user's state."),
});

const GetMarketPricesOutputSchema = z.array(MarketDataSchema).describe("An array of market data for nearby markets.");

const cropBasePrices: Record<string, number> = {
    tomato: 2500,
    corn: 2100,
    wheat: 2300,
    soybean: 4500,
    cotton: 6000,
};

export const getMarketPrices = ai.defineTool(
  {
    name: 'getMarketPrices',
    description: 'Get simulated real-time market prices for a given crop in nearby markets.',
    inputSchema: GetMarketPricesInputSchema,
    outputSchema: GetMarketPricesOutputSchema,
  },
  async ({ cropName, district, state }) => {
    if (!district || !state) return [];

    const markets = [];
    // Always include the user's district market
    markets.push({ name: `${district} Central Mandi` });

    // Find other random districts from the same state
    const districtsInState = indianStatesAndDistricts[state as keyof typeof indianStatesAndDistricts] || [];
    const otherDistricts = districtsInState.filter(d => d !== district);

    // Add up to 3 other random markets from the same state
    for (let i = 0; i < 3 && otherDistricts.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * otherDistricts.length);
        const randomDistrict = otherDistricts.splice(randomIndex, 1)[0];
        markets.push({ name: `${randomDistrict} Market` });
    }

    return markets.map(market => {
        const basePrice = cropBasePrices[cropName.toLowerCase()] || 2000;
        const price = basePrice + Math.floor(Math.random() * (basePrice * 0.2)) - (basePrice * 0.1); // +/- 10-20% variance
        const demandRoll = Math.random();
        const trendRoll = Math.random();

        return {
            name: market.name,
            price: Math.round(price), // Round to nearest rupee
            demand: demandRoll > 0.66 ? 'High' : demandRoll > 0.33 ? 'Medium' : 'Low',
            trend: trendRoll > 0.66 ? 'Up' : trendRoll > 0.33 ? 'Stable' : 'Down',
        };
    }).sort((a, b) => b.price - a.price);
  }
);

    