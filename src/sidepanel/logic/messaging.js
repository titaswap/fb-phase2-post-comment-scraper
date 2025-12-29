import { log } from '../ui/logger.js';
import { updateUI } from '../ui/render.js';

export function sendCmd(type, payload = null) {
    chrome.runtime.sendMessage({ type, payload }, (res) => {
        if (chrome.runtime.lastError) {
            log("❌ Error: " + chrome.runtime.lastError.message);
            return;
        }
        if (res && res.success === false) {
            log("❌ " + (res.error || "Failed"));
        } else if (res && res.success) {
            // Optional: Success logging if needed, or rely on UI updates
            if (type === "RESET_INDEX") log("🔄 Index reset");
        }
        // Force refresh status
        setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
    });
}
