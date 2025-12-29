import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { syncUIState } from '../state/sync.js';
import { startCountdown } from '../utils/time.js';

export function navigateTo(url, nextCallback) {
    if (!STATE.tabId) return;

    chrome.tabs.update(STATE.tabId, { url }, () => {
        if (chrome.runtime.lastError) {
            STATE.errors++;
            saveState();
            syncUIState();
            startCountdown(5000, nextCallback);
        }
    });
}
