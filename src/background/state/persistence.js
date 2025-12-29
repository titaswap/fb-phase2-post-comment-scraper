import { STATE } from './store.js';

export function saveState() {
    chrome.storage.local.set({
        phase1: STATE.posts,
        index: STATE.index,
        errors: STATE.errors,
        processed: Array.from(STATE.processed),
        safeMode: STATE.safeMode,
        minDelay: STATE.minDelay,
        maxDelay: STATE.maxDelay
    });
}
