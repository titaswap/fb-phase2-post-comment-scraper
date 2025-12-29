import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { syncUIState } from '../state/sync.js';
import { extractNumericId } from '../utils/ids.js';
import { setNavigationTimeout } from './timeout.js';
import { navigateTo } from './navigate.js';
import { getRandomDelay, startCountdown } from '../utils/time.js';

export function nextPost() {
    if (!STATE.running || STATE.paused) return;
    if (STATE.index >= STATE.posts.length) {
        STATE.running = false; // Finished
        return;
    }

    const post = STATE.posts[STATE.index];
    const nid = extractNumericId(post.post_link);

    if (nid && STATE.processedIds.has(nid)) {
        STATE.index++;
        saveState();
        setTimeout(nextPost, 10);
        return;
    }

    STATE.index++;
    syncUIState();

    setNavigationTimeout(() => {
        if (!STATE.running || STATE.paused) return;
        STATE.errors++;
        saveState();
        syncUIState();
        // User requested ONLY UI set delay.
        startCountdown(getRandomDelay(), nextPost);
    }, 45000); // Increased timeout to 45s to allow for slow loads, but removed extra delay.

    navigateTo(post.post_link, nextPost);
}
