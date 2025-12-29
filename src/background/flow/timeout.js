import { STATE } from '../state/store.js';

export function clearNavigationTimeout() {
    if (STATE.navigationTimeout) {
        clearTimeout(STATE.navigationTimeout);
        STATE.navigationTimeout = null;
    }
    if (STATE.timeoutTarget) {
        STATE.timeoutTarget = null;
        // Optionally sync here or let caller do it? 
        // Caller usually saves state, but let's be safe.
        // Wait, circular dep if we import sync everywhere?
        // timeout.js imports store.js. sync imports store.js.
        // If we import sync in timeout.js (done above), it's fine.
    }
    // We import syncUIState at top in previous step.
    // Re-doing the import for clear function if needed, but the previous step adds import.
}

import { syncUIState } from '../state/sync.js';

export function setNavigationTimeout(callback, ms = 30000) {
    clearNavigationTimeout();
    STATE.timeoutTarget = Date.now() + ms;
    syncUIState();
    STATE.navigationTimeout = setTimeout(() => {
        STATE.navigationTimeout = null;
        STATE.timeoutTarget = null;
        syncUIState();
        callback();
    }, ms);
}
