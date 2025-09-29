'use server';
/**
 * @fileOverview An AI agent for diagnosing farm-related problems.
 *
 * - diagnoseFarmProblem - A function that handles the farm problem diagnosis process.
 * - DiagnoseFarmProblemInput - The input type for the diagnoseFarmProblem function.
 * - DiagnoseFarmProblemOutput - The return type for the diagnoseFarmProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { textToSpeech } from './text-to-speech-flow';
import { MediaPart } from 'genkit/media';

const DiagnoseFarmProblemInputSchema = z.object({
  problemDescription: z.string().describe('A description of the problem on the farm.'),
  photoDataUri: z.string().optional().describe(
    "An optional photo of the problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  language: z.string().optional().describe('The language for the diagnosis output (e.g., "en", "te", "hi"). Defaults to English.'),
});
export type DiagnoseFarmProblemInput = z.infer<typeof DiagnoseFarmProblemInputSchema>;

const DiagnosisSchema = z.object({
    isHealthy: z.boolean().describe('Whether the subject (e.g., plant, soil) is considered healthy.'),
    issue: z.string().describe("The specific issue or disease identified, e.g., 'Blight', 'Nitrogen Deficiency'."),
    details: z.string().describe('A detailed explanation of the diagnosis.'),
});

const SolutionSchema = z.object({
    recommendation: z.string().describe('A concise, actionable recommendation to solve the problem.'),
    steps: z.array(z.string()).describe('A list of step-by-step instructions to implement the solution.'),
});

const DiagnoseFarmProblemOutputSchema = z.object({
  diagnosis: DiagnosisSchema,
  solution: SolutionSchema,
  audioDataUri: z.string().optional().describe('The synthesized audio of the diagnosis and solution as a WAV data URI.'),
});
export type DiagnoseFarmProblemOutput = z.infer<typeof DiagnoseFarmProblemOutputSchema>;

export async function diagnoseFarmProblem(input: DiagnoseFarmProblemInput): Promise<DiagnoseFarmProblemOutput> {
  return diagnoseFarmProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseFarmProblemPrompt',
  input: {
    schema: z.object({
        problemDescription: z.string(),
        language: z.string().optional(),
        photo: z.any().optional(),
    })
  },
  output: {schema: z.object({ diagnosis: DiagnosisSchema, solution: SolutionSchema })},
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an expert agronomist and agricultural scientist. Your goal is to help farmers by diagnosing problems and providing actionable solutions.

VERY IMPORTANT: You MUST generate the entire response (diagnosis and solution) in the language specified by the 'language' input, which is '{{language}}'. If no language is specified, default to English.

Analyze the user's problem description and the provided photo if it is available.

1.  **Diagnosis:** Identify the core issue. Is it a pest, a disease, a nutrient deficiency, a soil problem, or something else? Determine if the subject is healthy. Provide a clear "issue" name and detailed explanation.
2.  **Solution:** Provide a clear, concise recommendation. Then, outline a series of practical, step-by-step instructions that the farmer can follow to resolve the issue.

Problem Description: {{{problemDescription}}}
{{#if photo}}
Photo: {{media url=photo.url}}
{{/if}}
`,
});

const diagnoseFarmProblemFlow = ai.defineFlow(
  {
    name: 'diagnoseFarmProblemFlow',
    inputSchema: DiagnoseFarmProblemInputSchema,
    outputSchema: DiagnoseFarmProblemOutputSchema,
  },
  async ({ photoDataUri, ...restOfInput }) => {
    const promptInput: {
        problemDescription: string;
        language?: string;
        photo?: MediaPart;
    } = {
      ...restOfInput,
    };
    
    if (photoDataUri) {
      promptInput.photo = { url: photoDataUri };
    }
    
    const {output} = await prompt(promptInput);

    if (!output) {
      throw new Error("Failed to generate a diagnosis from the model.");
    }
    
    const textToSpeak = `
      Diagnosis: ${output.diagnosis.issue}.
      Details: ${output.diagnosis.details}.
      Recommendation: ${output.solution.recommendation}.
      Here are the steps: ${output.solution.steps.join('. ')}
    `;
    
    let audioDataUri: string | undefined;
    try {
        const audioResponse = await textToSpeech({ text: textToSpeak, language: restOfInput.language || 'en' });
        audioDataUri = audioResponse.audioDataUri;
    } catch (e: any) {
        console.error(`Error generating audio for diagnosis: ${e.message}`, e);
    }

    return {
      ...output,
      audioDataUri,
    };
  }
);
