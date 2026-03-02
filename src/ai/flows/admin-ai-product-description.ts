'use server';
/**
 * @fileOverview A Genkit flow for generating engaging, SEO-optimized product descriptions for plants.
 *
 * - adminAIProductDescription - A function that handles the AI product description generation process.
 * - AdminAIProductDescriptionInput - The input type for the adminAIProductDescription function.
 * - AdminAIProductDescriptionOutput - The return type for the adminAIProductDescription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAIProductDescriptionInputSchema = z.object({
  plantName: z.string().describe('The name of the plant.'),
  category: z.string().describe('The category of the plant (e.g., Indoor, Outdoor, Succulent).'),
});
export type AdminAIProductDescriptionInput = z.infer<typeof AdminAIProductDescriptionInputSchema>;

const AdminAIProductDescriptionOutputSchema = z.object({
  description: z.string().describe('An engaging and SEO-optimized product description for the plant.'),
});
export type AdminAIProductDescriptionOutput = z.infer<typeof AdminAIProductDescriptionOutputSchema>;

export async function adminAIProductDescription(input: AdminAIProductDescriptionInput): Promise<AdminAIProductDescriptionOutput> {
  return adminAIProductDescriptionFlow(input);
}

const adminAIProductDescriptionPrompt = ai.definePrompt({
  name: 'adminAIProductDescriptionPrompt',
  input: { schema: AdminAIProductDescriptionInputSchema },
  output: { schema: AdminAIProductDescriptionOutputSchema },
  prompt: `You are an expert e-commerce copywriter specializing in plant products. Your task is to create an engaging and SEO-optimized product description for a plant.

Craft a detailed product description that highlights the plant's unique features, benefits, and care instructions relevant to its category. Ensure the description is compelling, encourages purchase, and naturally incorporates keywords for search engine optimization.

Plant Name: {{{plantName}}}
Category: {{{category}}}`,
});

const adminAIProductDescriptionFlow = ai.defineFlow(
  {
    name: 'adminAIProductDescriptionFlow',
    inputSchema: AdminAIProductDescriptionInputSchema,
    outputSchema: AdminAIProductDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await adminAIProductDescriptionPrompt(input);
    return output!;
  }
);
