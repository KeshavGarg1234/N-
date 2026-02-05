'use server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

type YouTubeVideo = {
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
};

// Function to search for videos
export async function searchVideos(query: string): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY) {
        console.error('YouTube API key is not configured. Please set YOUTUBE_API_KEY in your .env file.');
        // Return mock data if API key is not set
        return [];
    }

    const url = `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&key=${YOUTUBE_API_KEY}&maxResults=10`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('YouTube API Error (Search):', data.error.message);
            throw new Error(`YouTube API Error: ${data.error.message}`);
        }

        if (!data.items) return [];

        return data.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
            channelTitle: item.snippet.channelTitle,
        }));
    } catch (error) {
        console.error('Failed to fetch from YouTube API:', error);
        return [];
    }
}

// Function to get playlist videos
export async function getPlaylist(playlistId: string): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY) {
        console.error('YouTube API key is not configured.');
        return [];
    }

    let allPlaylistItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    try {
        // 1. Fetch all playlist items, handling pagination
        do {
            const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
            const playlistItemsUrl = `${YOUTUBE_API_URL}/playlistItems?part=snippet&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}&maxResults=50${pageTokenParam}`;
            
            const response = await fetch(playlistItemsUrl);
            const data = await response.json();

            if (data.error) {
                console.error('YouTube API Error (PlaylistItems):', data.error.message);
                throw new Error(`YouTube API Error: ${data.error.message}`);
            }

            if (data.items) {
                allPlaylistItems = allPlaylistItems.concat(data.items);
            }

            nextPageToken = data.nextPageToken;

        } while (nextPageToken);
        
        if (allPlaylistItems.length === 0) return [];

        const allVideoIds = allPlaylistItems
            .map((item: any) => item.snippet.resourceId.videoId)
            .filter(Boolean);

        if (allVideoIds.length === 0) return [];

        // 2. Fetch video details in batches of 50
        let allEmbeddableVideos: YouTubeVideo[] = [];
        const videoIdChunks = [];
        for (let i = 0; i < allVideoIds.length; i += 50) {
            videoIdChunks.push(allVideoIds.slice(i, i + 50));
        }

        for (const chunk of videoIdChunks) {
            const videoIdsString = chunk.join(',');
            const videosUrl = `${YOUTUBE_API_URL}/videos?part=snippet,status&id=${videoIdsString}&key=${YOUTUBE_API_KEY}`;
            const videosResponse = await fetch(videosUrl);
            const videosData = await videosResponse.json();

            if (videosData.error) {
                console.error('YouTube API Error (Videos):', videosData.error.message);
                // Continue to next chunk even if one fails
                continue; 
            }

            if (!videosData.items) continue;

            const embeddableVideos = videosData.items
                .filter((item: any) => item.status.embeddable)
                .map((item: any) => ({
                    videoId: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                    channelTitle: item.snippet.channelTitle,
                }));
            
            allEmbeddableVideos = allEmbeddableVideos.concat(embeddableVideos);
        }

        return allEmbeddableVideos;

    } catch (error) {
        console.error('Failed to process playlist:', error);
        return [];
    }
}
