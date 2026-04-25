import { downloadMedia } from '@/utils/media';

interface DownloadTask {
    url: string;
    id: string;
    onComplete: (localUri: string) => void;
    onError: (error: any) => void;
}

class DownloadManager {
    private queue: DownloadTask[] = [];
    private activeDownloads = 0;
    private maxConcurrent = 2;

    enqueue(url: string, id: string, onComplete: (uri: string) => void, onError: (err: any) => void) {
        this.queue.push({ url, id, onComplete, onError });
        this.processQueue();
    }

    private async processQueue() {
        if (this.activeDownloads >= this.maxConcurrent || this.queue.length === 0) return;

        const task = this.queue.shift();
        if (!task) return;

        this.activeDownloads++;
        try {
            console.log(`[DownloadManager] Starting: ${task.id}`);
            const localUri = await downloadMedia(task.url, task.id);
            if (localUri) {
                task.onComplete(localUri);
            }
        } catch (e) {
            task.onError(e);
        } finally {
            this.activeDownloads--;
            this.processQueue();
        }
    }
}

export const downloadManager = new DownloadManager();
