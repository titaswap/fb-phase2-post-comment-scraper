import { EL } from '../ui/dom.js';
import { log } from '../ui/logger.js';
import { updateUI } from '../ui/render.js';


// FIX: Sidepanel must use messaging/storage to know state.
// We just load payload and send to background.

export function setupFileHandlers() {
    EL.inputs.file.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                chrome.runtime.sendMessage({ type: "LOAD_PHASE1", payload: data }, (res) => {
                    log(res.success ? `✅ Phase 1: ${data.length} posts` : "❌ Failed");
                });
            } catch (e) { log("❌ Invalid JSON"); }
        };
        reader.readAsText(file);
    };

    EL.inputs.finalFile.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!Array.isArray(data)) throw new Error("Not array");
                chrome.runtime.sendMessage({ type: "LOAD_FINAL", payload: data }, (res) => {
                    log(res.success ? `✅ Final loaded` : "❌ Failed");
                });
            } catch (e) { log("❌ Invalid Final Data"); }
        };
        reader.readAsText(file);
    };
}
