import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { syncUIState } from '../state/sync.js';
import { nextPost } from '../flow/next.js';
import { handlePostData } from '../flow/handler.js';
import { fetchServerProcessedIds } from '../network/fetch.js';
import { clearNavigationTimeout } from '../flow/timeout.js';

export function handleMessage(msg, sender, sendResponse) {
    if (msg.type === "POST_DATA") {
        handlePostData(msg.payload);
        sendResponse({ success: true });
        return true;
    }
    if (msg.type === "GET_STATUS") {
        syncUIState(); // Ensures UI gets latest via storage
        sendResponse(STATE); // Also send direct for fallback
        return true;
    }
    // ... Delegating other large blocks to specific modules ...
    // For now, implementing common ones here
    return false; // Let other handlers try
}
