'use server';

/**
 * @fileOverview Searches for YouTube videos using the YouTube Data API.
 *
 * - searchYouTube - A function that searches YouTube for videos.
 * - SearchYouTubeInput - The input type for the searchYouTube function.
 * - SearchYouTubeOutput - The return type for the searchYouTube function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchVideos } from '@/lib/youtube';

// == Schemas ===============================================================

const SearchYouTubeInputSchema = z.object({
    query: z.string().describe('The search query for YouTube videos.'),
});
export type SearchYouTubeInput = z.infer<typeof SearchYouTubeInputSchema>;

const YouTubeVideoSchema = z.object({
    videoId: z.string(),
    title: z.string(),
    description: z.string(),
    thumbnail: z.string(),
    channelTitle: z.string(),
});

const SearchYouTubeOutputSchema = z.object({
  videos: z.array(YouTubeVideoSchema).describe('A list of YouTube video search results.'),
  usingFallback: z.boolean().optional().describe('True if the search results are from a fallback mechanism because the primary search failed.')
});
export type SearchYouTubeOutput = z.infer<typeof SearchYouTubeOutputSchema>;


// == Exported Function =====================================================

export async function searchYouTube(input: SearchYouTubeInput): Promise<SearchYouTubeOutput> {
    return searchYouTubeFlow(input);
}

// == Main Flow =============================================================

const searchYouTubeFlow = ai.defineFlow(
  {
    name: 'searchYouTubeFlow',
    inputSchema: SearchYouTubeInputSchema,
    outputSchema: SearchYouTubeOutputSchema,
  },
  async (input): Promise<SearchYouTubeOutput> => {
    try {
        const videos = await searchVideos(input.query);
        return { videos }; // Success case
    } catch (error: any) {
        console.error('YouTube Data API search failed:', error.message);
        // On failure, return an empty list and a flag.
        return { videos: [], usingFallback: true };
    }
  }
);
