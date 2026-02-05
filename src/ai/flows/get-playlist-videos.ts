'use server';

/**
 * @fileOverview Fetches video details from a YouTube playlist URL using the YouTube Data API.
 *
 * - getPlaylistVideos - A function that fetches video details from a YouTube playlist.
 * - GetPlaylistVideosInput - The input type for the getPlaylistVideos function.
 * - GetPlaylistVideosOutput - The return type for the getPlaylistVideos function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getPlaylist } from '@/lib/youtube';
import { extractPlaylistID } from '@/lib/utils';

const GetPlaylistVideosInputSchema = z.object({
    playlistUrl: z.string().describe('The URL of the YouTube playlist.'),
});
export type GetPlaylistVideosInput = z.infer<typeof GetPlaylistVideosInputSchema>;

const YouTubeVideoSchema = z.object({
    videoId: z.string(),
    title: z.string(),
    description: z.string(),
    thumbnail: z.string(),
    channelTitle: z.string(),
});

const GetPlaylistVideosOutputSchema = z.object({
  videos: z.array(YouTubeVideoSchema),
  // This flag tells the UI if the operation failed and we're showing nothing as a result.
  usingFallback: z.boolean().optional()
});
export type GetPlaylistVideosOutput = z.infer<typeof GetPlaylistVideosOutputSchema>;


export async function getPlaylistVideos(input: GetPlaylistVideosInput): Promise<GetPlaylistVideosOutput> {
    return getPlaylistVideosFlow(input);
}

const getPlaylistVideosFlow = ai.defineFlow(
  {
    name: 'getPlaylistVideosFlow',
    inputSchema: GetPlaylistVideosInputSchema,
    outputSchema: GetPlaylistVideosOutputSchema,
  },
  async (input): Promise<GetPlaylistVideosOutput> => {
    try {
      const playlistId = extractPlaylistID(input.playlistUrl);
      if (!playlistId) {
        console.error('Could not extract playlist ID from URL:', input.playlistUrl);
        return { videos: [], usingFallback: true };
      }

      const videos = await getPlaylist(playlistId);
      
      // Success case
      return { videos };

    } catch (error: any) {
      console.error('YouTube Data API playlist fetch failed:', error.message);
      
      // On any failure, return an empty list and a flag.
      return { videos: [], usingFallback: true };
    }
  }
);
