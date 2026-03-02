'use server';
/**
 * @fileOverview An AI agent for generating marketing content for affiliate products.
 *
 * - generateMarketingContent - A function that handles the marketing content generation process.
 * - GenerateMarketingContentInput - The input type for the generateMarketingContent function.
 * - GenerateMarketingContentOutput - The return type for the generateMarketingContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMarketingContentInputSchema = z.object({
  plantName: z.string().describe('The name of the plant product.'),
  plantCategory: z.string().describe('The category of the plant (e.g., Indoor Plants, Outdoor Plants, Seeds).'),
  plantDescription: z.string().describe('A detailed description of the plant product.'),
  plantPrice: z.number().describe('The price of the plant product.'),
  referralLink: z.string().url().describe('The unique affiliate referral URL for this product.'),
  imageUrl: z.string().url().optional().describe('An optional URL to an image of the plant.'),
});
export type GenerateMarketingContentInput = z.infer<typeof GenerateMarketingContentInputSchema>;

const GenerateMarketingContentOutputSchema = z.object({
  socialMediaPost: z.string().describe('A concise and engaging social media post (e.g., for Instagram, Facebook, X).'),
  emailSnippet: z.string().describe('A short, compelling email snippet suitable for a newsletter or promotional email.'),
  callToAction: z.string().describe('A strong call to action for the marketing content.'),
  hashtags: z.array(z.string()).describe('A list of relevant hashtags for social media.'),
});
export type GenerateMarketingContentOutput = z.infer<typeof GenerateMarketingContentOutputSchema>;

export async function generateMarketingContent(
  input: GenerateMarketingContentInput
): Promise<GenerateMarketingContentOutput> {
  return generateMarketingContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMarketingContentPrompt',
  input: {schema: GenerateMarketingContentInputSchema},
  output: {schema: GenerateMarketingContentOutputSchema},
  prompt: `You are an expert marketing content creator specializing in plants and gardening.
Your goal is to create compelling marketing content for an affiliate product.

Generate marketing content based on the following product details:

Plant Name: {{{plantName}}}
Category: {{{plantCategory}}}
Description: {{{plantDescription}}}
Price: $p{{{plantPrice}}}
Referral Link: {{{referralLink}}}
{{#if imageUrl}}Image URL: {{{imageUrl}}}{{/if}}

Create a social media post, an email snippet, a clear call to action, and relevant hashtags.
Make the content engaging, benefit-oriented, and encourage clicks to the referral link.
Ensure the tone is professional, enthusiastic, and aligns with a nature-inspired brand.`,
});

const generateMarketingContentFlow = ai.defineFlow(
  {
    name: 'generateMarketingContentFlow',
    inputSchema: GenerateMarketingContentInputSchema,
    outputSchema: GenerateMarketingContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
