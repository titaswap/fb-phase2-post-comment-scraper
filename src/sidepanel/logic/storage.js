import { updateUI } from '../ui/render.js';
import { renderProgress } from '../ui/progress.js';
import { updateButtons } from '../ui/buttons.js';
import { handleCountdown } from './countdown.js';

export function syncFromStorage(changes) {
    const state = changes?.ui_state?.newValue || changes;
    if (state) {
        updateUI(state);
        renderProgress(state);
        updateButtons(state);
        handleCountdown(state);
    }
}

export function initStorageListener() {
    chrome.storage.local.onChanged.addListener((changes) => {
        if (changes.ui_state) syncFromStorage(changes.ui_state.newValue);
    });
    chrome.storage.local.get('ui_state', (res) => {
        if (res.ui_state) syncFromStorage(res.ui_state);
    });
}
