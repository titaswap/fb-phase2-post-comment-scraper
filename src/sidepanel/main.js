import { initStorageListener } from './logic/storage.js';
import { setupControls } from './handlers/controls.js';
import { setupFileHandlers } from './handlers/files.js';
import { setupDelayHandlers } from './handlers/delays.js';
import { checkServerHealth } from './logic/health.js';
import { updateUI } from './ui/render.js';

import { log } from './ui/logger.js';

initStorageListener();
log("🚀 Sidepanel Module Loaded");
setupControls();
setupFileHandlers();
setupFileHandlers();
setupDelayHandlers();

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "LOG") log(msg.payload);
});


setInterval(checkServerHealth, 2000);
checkServerHealth();

// Initial Pull
setTimeout(() => {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
        if (res) updateUI(res);
    });
}, 100);
