import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
    console.warn('Missing environment variable: EXPO_PUBLIC_BACKEND_URL');
}

const MEDIA_URL = BACKEND_URL ? `${BACKEND_URL}/media` : null;

/**
 * Constructs a full media URL from a relative path
 * @param relativePath - The relative path from backend (e.g., "/media/chat_files/image.jpg" or "chat_files/image.jpg")
 * @returns Full URL (e.g., "http://192.168.76.173:8001/media/chat_files/image.jpg")
 */
export const getMediaUrl = (relativePath: string | null | undefined): string | null => {
    if (!relativePath || !MEDIA_URL) return null;

    // If it's already a full URL (starts with http:// or https://), return as-is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }

    // If it's a local file URI, return as-is
    if (relativePath.startsWith('file://')) {
        return relativePath;
    }

    // Remove leading slash if present
    let cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    // If the path already starts with 'media/', don't add it again
    if (cleanPath.startsWith('media/')) {
        return `${BACKEND_URL}/${cleanPath}`;
    }

    // Otherwise, add /media/ prefix
    return `${MEDIA_URL}/${cleanPath}`;
};

/**
 * Downloads a media file from the server and saves it locally
 * @param remoteUrl - The full URL to download from
 * @param messageId - The message ID to use for the filename
 * @returns Local file URI or null if download fails
 */
export const downloadMedia = async (remoteUrl: string, messageId: string): Promise<string | null> => {
    try {
        if (!remoteUrl) return null;

        // Create a unique filename based on message ID and original extension
        const extension = remoteUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${messageId}.${extension}`;

        // Ensure media directory exists using new API
        const mediaDir = new Directory(Paths.document, 'media');
        if (!mediaDir.exists) {
            await mediaDir.create();
        }

        // Check if file already exists locally
        const file = new File(mediaDir, filename);
        if (file.exists) {
            console.log('[Media] File already exists locally:', file.uri);
            return file.uri;
        }

        try {
            // Use the legacy downloadAsync for now as the new API is different
            console.log('[Media] Downloading from:', remoteUrl, 'to:', file.uri);
            const result = await FileSystem.downloadAsync(remoteUrl, file.uri);
            if (result.status === 200) {
                console.log('[Media] Download successful:', file.uri);
                return file.uri;
            } else {
                console.error('[Media] Download failed with status:', result.status);
                return null;
            }
        } catch (downloadError) {
            console.error('[Media] Download failed:', downloadError);
            return null;
        }
    } catch (error) {
        console.error('[Media] Download error:', error);
        return null;
    }
};

/**
 * Gets the local file URI if it exists, otherwise returns null
 * @param messageId - The message ID
 * @param extension - File extension
 * @returns Local file URI if exists, null otherwise
 */
export const getLocalMediaUri = async (messageId: string, extension: string = 'jpg'): Promise<string | null> => {
    try {
        const mediaDir = new Directory(Paths.document, 'media');
        const filename = `${messageId}.${extension}`;
        const file = new File(mediaDir, filename);

        if (file.exists) {
            return file.uri;
        }
        return null;
    } catch (error) {
        console.error('[Media] Error checking local file:', error);
        return null;
    }
};

/**
 * Deletes a local media file
 * @param messageId - The message ID
 * @param extension - File extension
 */
export const deleteLocalMedia = async (messageId: string, extension: string = 'jpg'): Promise<void> => {
    try {
        const mediaDir = new Directory(Paths.document, 'media');
        const filename = `${messageId}.${extension}`;
        const file = new File(mediaDir, filename);

        if (file.exists) {
            await file.delete();
            console.log('[Media] Deleted local file:', file.uri);
        }
    } catch (error) {
        console.error('[Media] Error deleting local file:', error);
    }
};
