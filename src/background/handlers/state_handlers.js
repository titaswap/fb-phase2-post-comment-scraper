import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';

export function handleStateMsg(msg, sendResponse) {
    if (msg.type === "LOAD_PHASE1") {
        STATE.posts = msg.payload;
        STATE.index = 0;
        STATE.processed = new Set();
        STATE.errors = 0;
        saveState();
        return sendResponse({ success: true });
    }
    if (msg.type === "LOAD_FINAL") {
        STATE.processed = new Set();
        if (Array.isArray(msg.payload)) {
            msg.payload.forEach(i => i.post?.id && STATE.processed.add(i.post.id));
        }
        saveState();
        return sendResponse({ success: true });
    }
    return false;
}
