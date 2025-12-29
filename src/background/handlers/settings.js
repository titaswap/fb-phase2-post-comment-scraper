import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { syncUIState } from '../state/sync.js';

export function handleSettings(msg, sendResponse) {
    if (msg.type === "UPDATE_DELAY_SETTINGS") {
        if (msg.payload.min) STATE.minDelay = msg.payload.min;
        if (msg.payload.max) STATE.maxDelay = msg.payload.max;
        saveState();
        syncUIState();
        return sendResponse({ success: true });
    }
    if (msg.type === "TOGGLE_SAFE_MODE") {
        STATE.safeMode = msg.payload;
        STATE.minDelay = STATE.safeMode ? 30 : 10;
        STATE.maxDelay = STATE.safeMode ? 60 : 30;
        saveState();
        syncUIState();
        return sendResponse({ success: true });
    }
    return false;
}
