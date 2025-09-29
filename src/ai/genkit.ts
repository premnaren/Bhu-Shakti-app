import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let aiInstance: Genkit | null = null;

export const ai = (() => {
  if (aiInstance) {
    return aiInstance;
  }
  aiInstance = genkit({
    plugins: [googleAI()],
    defaultModel: 'googleai/gemini-2.5-flash',
  });
  return aiInstance;
})();
