import { STATE } from './src/background/state/store.js';
import { fetchServerTotal } from './src/background/network/fetch.js';
import { syncUIState } from './src/background/state/sync.js';
import { handleMessage } from './src/background/handlers/messages.js';
import { handleControls } from './src/background/handlers/actions.js';
import { handleStateMsg } from './src/background/handlers/state_handlers.js';
import { handleSettings } from './src/background/handlers/settings.js';
import { handleManual } from './src/background/handlers/manual.js';
import { handleIndexing } from './src/background/handlers/indexing.js';

// Init
chrome.storage.local.get(null, (res) => {
    if (res.phase1) STATE.posts = res.phase1;
    if (res.index) STATE.index = res.index;
    if (res.minDelay) STATE.minDelay = res.minDelay;
    if (res.maxDelay) STATE.maxDelay = res.maxDelay;
    if (res.processed) STATE.processed = new Set(res.processed);
    fetchServerTotal();
    syncUIState();
});

chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent(w => chrome.sidePanel.open({ windowId: w.id }));
});

chrome.runtime.onMessage.addListener((msg, sender, res) => {
    if (handleMessage(msg, sender, res)) return true;
    if (handleControls(msg, res)) return true;
    if (handleStateMsg(msg, res)) return true;
    if (handleSettings(msg, res)) return true;
    if (handleManual(msg, res)) return true;
    if (handleIndexing(msg, res)) return true;
});
