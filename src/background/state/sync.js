import { STATE } from './store.js';

export function syncUIState() {
    chrome.storage.local.set({
        ui_state: {
            running: STATE.running,
            paused: STATE.paused,
            progress: `${STATE.index}/${STATE.posts.length}`,
            errors: STATE.errors,
            finalCount: STATE.serverTotal,
            safeMode: STATE.safeMode,
            countdownTarget: STATE.countdownTarget,
            timeoutTarget: STATE.timeoutTarget, // New
            minDelay: STATE.minDelay,
            maxDelay: STATE.maxDelay,
            ts: Date.now()
        }
    });
}
