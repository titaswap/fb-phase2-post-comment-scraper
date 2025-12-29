import { STATE } from '../state/store.js';
import { syncUIState } from '../state/sync.js';
import { extractNumericId } from '../utils/ids.js';
import { APPEND_URL } from './config.js';

export function sendDataToServer(dataItems) {
    if (!dataItems.length) return;

    fetch(APPEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataItems)
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                STATE.serverTotal = data.total;
                syncUIState();

                const url = dataItems[0]?.url || dataItems[0]?.post?.post_link || dataItems[0]?.post_link || "";
                let pid = dataItems[0]?.post?.id;
                if (!pid && url) pid = extractNumericId(url);

                const label = pid ? `ID: ${pid}` : (url.length > 30 ? url.substring(0, 30) + "..." : url);

                if (data.appended > 0) {
                    chrome.runtime.sendMessage({ type: "LOG", payload: `✅ Added: ${label}` }).catch(() => { });
                } else if (data.updated > 0) {
                    chrome.runtime.sendMessage({ type: "LOG", payload: `♻️ Updated: ${label}` }).catch(() => { });
                } else {
                    chrome.runtime.sendMessage({ type: "LOG", payload: `⚠️ Duplicate: ${label}` }).catch(() => { });
                }
            } else {
                chrome.runtime.sendMessage({ type: "LOG", payload: `❌ Server Error: ${data.error}` }).catch(() => { });
            }
        })
        .catch((e) => {
            chrome.runtime.sendMessage({ type: "LOG", payload: `❌ Network Error: ${e.message}` }).catch(() => { });
        });
}
