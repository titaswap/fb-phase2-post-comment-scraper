// State Management
export const STATE = {
    posts: [],
    index: 0,
    running: false,
    paused: false,
    tabId: null,
    errors: 0,
    processed: new Set(),
    processedIds: new Set(),
    navigationTimeout: null,
    timeoutTarget: null, // New: Tracks when timeout will fire
    countdownTimer: null,
    countdownTarget: null,
    serverTotal: 0,
    safeMode: false,
    minDelay: 10,
    maxDelay: 30
};
