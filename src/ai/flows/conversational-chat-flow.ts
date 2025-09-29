'use server';
/**
 * @fileOverview A conversational AI agent for farmers.
 *
 * - chatWithFarmhand - A function that handles the conversation.
 * - ChatWithFarmhandInput - The input type for the chatWithFarmhand function.
 * - ChatWithFarmhandOutput - The return type for the chatWithFarmhand function.
 */

import {ai} from '@/ai/genkit';
import {getSuggestions, getWeather, getSeedInfo} from '@/ai/tools/farm-tools';
import {z} from 'genkit';
import { textToSpeech } from './text-to-speech-flow';
import {Content, Part} from 'genkit/model';


const ChatWithFarmhandInputSchema = z.object({
  message: z.string().describe("The user's message."),
  history: z.array(Content).optional().describe('The conversation history.'),
  language: z.string().optional().describe('The language for the response (e.g., "en", "te", "hi"). Defaults to English.'),
});
export type ChatWithFarmhandInput = z.infer<typeof ChatWithFarmhandInputSchema>;

const ChartDataSchema = z.object({
    type: z.literal('chart'),
    data: z.object({
        title: z.string().describe("The title of the chart (e.g., '7-Day Temperature Forecast')."),
        description: z.string().describe("A brief, insightful description of the chart's data and what it represents, including units (e.g., 'Average daily temperature in Celsius for the upcoming week.')."),
        chartType: z.enum(['bar', 'line', 'pie', 'area']).describe("The type of chart to display."),
        data: z.array(z.object({
            name: z.string().describe("The label for the data point (e.g., a date like '2024-09-23', or a category like 'Corn')."),
            value: z.number().describe("The numerical value for the data point."),
        })).describe("The array of data points for the chart.")
    }),
});

const TextResponseSchema = z.object({
    type: z.literal('text'),
    data: z.string().describe("The plain text response to the user's message."),
});

const ChatWithFarmhandOutputSchema = z.union([TextResponseSchema, ChartDataSchema]);

export type ChatWithFarmhandOutput = z.infer<typeof ChatWithFarmhandOutputSchema>;

const FinalResponseSchema = z.object({
    type: z.enum(['text', 'chart']),
    data: z.any(),
    audio: z.string().optional(),
});

const conversationalPrompt = ai.definePrompt({
  name: 'conversationalPrompt',
  input: {
    schema: z.object({
      message: z.string(),
      history: z.array(Content),
      language: z.string().optional(),
    }),
  },
  output: {
    schema: ChatWithFarmhandOutputSchema,
  },
  model: 'googleai/gemini-2.5-flash',
  system: `You are Bhu-Shakti, a helpful and empathetic AI assistant for farmers. Your primary goal is to provide practical, simple, and supportive advice.

**Core Instructions:**

1.  **Language:** You MUST respond in the language specified by the 'language' input: '{{language}}'. If not provided, default to English.
2.  **Prioritize Normal Conversation:** For simple greetings (e.g., "Hi," "Hello") or basic conversational questions, respond naturally with a 'text' response. Your first instinct should be to chat like a friendly expert.
3.  **Use Tools When Necessary:** If the user's question requires specific data (like weather, market prices, or seed info), use the available tools. If the user asks about a specific seed variety (e.g., "Tell me about IR-64 rice"), you should pass that full name to the 'getSeedInfo' tool. The conversation history will contain the results of previous tool calls; use this context to answer follow-up questions.
4.  **CHART GENERATION:** If a user asks for data that can be visualized (like a weather forecast), you MUST respond with a 'chart' object. Use the tool to get the data first, then format it for the chart.
    *   For a time-series forecast (like weather), use a 'bar' or 'area' chart. The chart title and description should be informative, mentioning the location and units (e.g., 'Temperature in °C').
    *   For compositional data (like crop distribution), use a 'pie' chart.
    *   You have 'bar', 'line', 'area', and 'pie' charts at your disposal. Choose the most appropriate one.
5.  **Tool Responses (Text):** When a tool is used for a non-chart response (like 'getSuggestions' or 'getSeedInfo'), provide the tool's output directly and concisely as a 'text' response. After giving the direct answer, you can then ask a follow-up question like "Is there anything else I can help with?". If a tool returns an error (e.g., for an unknown crop), politely inform the user that you don't have information on that specific item.
6.  **Simple Language:** Use plain language that someone who is not an expert can easily understand. Avoid jargon and long paragraphs.
7.  **Ask for Clarification:** If a user's message is ambiguous, contradictory, or completely unclear, do not guess. Politely ask for more details.
8.  **Stay in Character:** You are Bhu-Shakti, a friendly farmhand expert. Be patient and helpful.`,
  prompt: '{{{message}}}',
  tools: [getWeather, getSuggestions, getSeedInfo],
});

export async function chatWithFarmhand(
  input: ChatWithFarmhandInput
): Promise<z.infer<typeof FinalResponseSchema>> {
  try {
    const modelResponse = await conversationalPrompt({
        message: input.message,
        history: input.history || [],
        language: input.language || 'en',
    });
    
    let response: ChatWithFarmhandOutput | undefined;
    if (typeof modelResponse.output === 'string') {
        response = { type: 'text', data: modelResponse.output };
    } else {
        response = modelResponse.output;
    }

    if (!response) {
      throw new Error("The model did not return a valid response.");
    }
    
    let textToSpeak = '';
    if (response.type === 'text') {
        textToSpeak = response.data;
    } else if (response.type === 'chart' && response.data?.title && response.data?.description) {
        textToSpeak = `${response.data.title}. ${response.data.description}`;
    }

    let audioDataUri: string | undefined;
    if (textToSpeak) {
        try {
            const audioResponse = await textToSpeech({ text: textToSpeak, language: input.language || 'en' });
            audioDataUri = audioResponse.audioDataUri;
        } catch (e: any) {
            console.error(`Error generating audio: ${e.message}`, e);
        }
    }

    const finalResponse = { ...response, audio: audioDataUri };

    const validatedResponse = FinalResponseSchema.safeParse(finalResponse);
    if (validatedResponse.success) {
      return validatedResponse.data;
    } else {
      console.error("Final response validation failed:", validatedResponse.error);
      throw new Error("The response format was unexpected after processing.");
    }

  } catch (e: any) {
     console.error(`Error in chatWithFarmhand: ${e.message}`, e);
     // Handle specific transient errors like 503 Service Unavailable
     if (e.message && e.message.includes('503 Service Unavailable')) {
        const busyResponse: z.infer<typeof FinalResponseSchema> = {
            type: 'text',
            data: "I'm sorry, the AI service is currently very busy. Please try again in a moment.",
            audio: undefined,
        };
        return busyResponse;
     }
     throw new Error(e.message || "An unknown error occurred while processing your request.");
  }
}

    