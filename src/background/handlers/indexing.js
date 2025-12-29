import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';

export function handleIndexing(msg, sendResponse) {
    if (msg.type === "RESET_INDEX") {
        STATE.index = 0;
        STATE.processed = new Set();
        STATE.errors = 0;
        saveState();
        return sendResponse({ success: true });
    }
    if (msg.type === "SET_INDEX") {
        const idx = msg.payload;
        if (idx < 0 || idx >= STATE.posts.length) {
            return sendResponse({ error: "Invalid index" });
        }
        STATE.index = idx;
        saveState();
        return sendResponse({ success: true });
    }
    return false;
}
