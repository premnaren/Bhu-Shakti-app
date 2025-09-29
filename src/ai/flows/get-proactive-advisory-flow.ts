'use server';
/**
 * @fileOverview An AI agent for generating proactive farm advisories.
 *
 * - getProactiveAdvisory - A function that generates a new advisory.
 * - ProactiveAdvisoryOutput - The return type for the getProactiveAdvisory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProactiveAdvisoryInputSchema = z.object({
  location: z.string().describe('The user\'s location (e.g., city, district) to tailor the advisory.'),
  language: z.string().optional().describe('The language for the advisory output (e.g., "en", "te", "hi"). Defaults to English.'),
  crops: z.array(z.string()).describe('A list of crops the farmer is currently growing.'),
  soilType: z.string().describe('The dominant soil type of the farm.'),
});
export type ProactiveAdvisoryInput = z.infer<typeof ProactiveAdvisoryInputSchema>;

const ProactiveAdvisoryOutputSchema = z.object({
  title: z.string().describe("The main title of the advisory, e.g., 'Fungal Disease Alert for Wheat' or 'Heat Stress Warning for Corn'."),
  urgency: z.enum(['High', 'Medium', 'Low']).describe('The urgency level of the advisory.'),
  riskProbability: z.number().int().min(0).max(100).describe('The calculated probability of the risk occurring, from 0 to 100.'),
  pestOrDisease: z.string().describe('The name of the most likely pest or disease, e.g., "Rust Fungus" or "Aphids".'),
  affectedCrop: z.string().describe('The specific crop from the input list that is most likely to be affected.'),
  impactAnalysis: z.string().describe("A detailed analysis of how the upcoming weather patterns will impact the specified crop and soil type, leading to this risk."),
  preventiveAction: z.string().describe('A single, concise, and highly specific preventive action the farmer should take immediately. For example, "Apply a preventive spray of Propiconazole fungicide." or "Ensure drip irrigation runs for an extra 20 minutes in the morning."'),
  imageHint: z.string().describe('Two keywords for generating a relevant image, e.g., "wheat rust" or "corn heat stress".'),
});
export type ProactiveAdvisoryOutput = z.infer<typeof ProactiveAdvisoryOutputSchema>;

export async function getProactiveAdvisory(input: ProactiveAdvisoryInput): Promise<ProactiveAdvisoryOutput> {
  return proactiveAdvisoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'proactiveAdvisoryPrompt',
  input: {schema: ProactiveAdvisoryInputSchema},
  output: {schema: ProactiveAdvisoryOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an Agricultural Predictive Modeling Engine. Your purpose is to provide hyper-specific, data-driven, and actionable advice to farmers based on their unique farm conditions and upcoming weather patterns.

You MUST generate the entire response in the language specified by the 'language' input, which is '{{language}}'. If no language is specified, default to English.

**Farmer's Context:**
- Location: {{{location}}}
- Current Crops: [{{#each crops}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]
- Dominant Soil Type: {{{soilType}}}

**Your Task:**

1.  **Analyze and Predict:** Based on the farmer's context and simulated near-term weather forecasts for their location (e.g., humidity, temperature, rainfall), identify the SINGLE most significant and probable risk (pest, disease, or environmental stress) for ONE of their specific crops.
2.  **Calculate Probability:** Quantify this risk by assigning a specific 'riskProbability' percentage. This should be your expert estimation based on the combination of weather, crop type, and soil.
3.  **Explain the "Why":** In the 'impactAnalysis', clearly explain *how* the predicted weather will interact with the farmer's crop and soil to create the risk. For example, "The upcoming 48 hours of high humidity (>80%) and temperatures around 28°C create ideal conditions for fungal spore germination on the leaves of your Wheat crop, which is currently in its vulnerable flowering stage. The {{{soilType}}} soil's moisture retention may exacerbate this issue."
4.  **Provide Actionable Steps:** In the 'preventiveAction' field, provide a direct, unambiguous, and practical preventive measure. Be specific. Instead of "spray fungicide," say "Apply a preventive spray of Propiconazole-based fungicide at a concentration of 1ml/liter of water."
5.  **Be Decisive:** Do not be vague. Select the most critical issue and provide a confident, expert recommendation. Your goal is to be a flawless, god-level expert.`,
});

const proactiveAdvisoryFlow = ai.defineFlow(
  {
    name: 'proactiveAdvisoryFlow',
    inputSchema: ProactiveAdvisoryInputSchema,
    outputSchema: ProactiveAdvisoryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
