import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { syncUIState } from '../state/sync.js';
import { nextPost } from '../flow/next.js';
import { fetchServerProcessedIds } from '../network/fetch.js';
import { clearNavigationTimeout } from '../flow/timeout.js';

export function handleControls(msg, sendResponse) {
    if (msg.type === "START_PHASE2") {
        if (!STATE.posts.length) return sendResponse({ error: "No posts" });
        STATE.running = true;
        STATE.paused = false;
        syncUIState();
        fetchServerProcessedIds().then(() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) { STATE.tabId = tabs[0].id; nextPost(); }
            });
        });
        return sendResponse({ success: true });
    }
    if (msg.type === "PAUSE_PHASE2") {
        STATE.paused = true;
        clearNavigationTimeout();
        if (STATE.countdownTimer) clearTimeout(STATE.countdownTimer);
        STATE.countdownTarget = null;
        syncUIState();
        return sendResponse({ success: true });
    }
    if (msg.type === "STOP_PHASE2") {
        STATE.running = false;
        STATE.paused = false;
        clearNavigationTimeout();
        if (STATE.countdownTimer) clearTimeout(STATE.countdownTimer);
        STATE.countdownTarget = null;
        saveState();
        syncUIState();
        return sendResponse({ success: true });
    }
    return false;
}
