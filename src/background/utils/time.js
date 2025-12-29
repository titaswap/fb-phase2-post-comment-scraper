import { STATE } from '../state/store.js';
import { syncUIState } from '../state/sync.js';

export function startCountdown(durationMs, onComplete) {
    if (STATE.countdownTimer) clearTimeout(STATE.countdownTimer);

    STATE.countdownTarget = Date.now() + durationMs;
    syncUIState();

    STATE.countdownTimer = setTimeout(() => {
        STATE.countdownTimer = null;
        STATE.countdownTarget = null;
        syncUIState();
        onComplete();
    }, durationMs);
}

export function getRandomDelay() {
    let min = (STATE.minDelay || 10) * 1000;
    let max = (STATE.maxDelay || 30) * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
