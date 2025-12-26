// Side Panel Script for FB Phase-2 Extractor

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const errorsEl = document.getElementById("errors");
const finalCountEl = document.getElementById("final-count");

// Utility functions
const log = msg => {
    const timestamp = new Date().toLocaleTimeString();
    logEl.textContent += `[${timestamp}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
};

const setStatus = msg => {
    statusEl.textContent = msg;
};

const updateUI = (status) => {
    setStatus(status.running ? (status.paused ? "Paused" : "Running") : "Idle");
    progressEl.textContent = `Progress: ${status.progress}`;
    errorsEl.textContent = `Errors: ${status.errors}`;
    finalCountEl.textContent = `Collected: ${status.finalCount}`;

    // Update auto-save status
    const autoSaveEl = document.getElementById("auto-save-status");
    if (status.running && !status.paused) {
        autoSaveEl.textContent = "Auto-save: Active (to ./data/final.json via server)";
        autoSaveEl.style.color = "#28a745";
    } else {
        autoSaveEl.textContent = "Auto-save: Requires local server (npm start)";
        autoSaveEl.style.color = "#666";
    }
};

// Load initial status
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (response) updateUI(response);
});

// File upload handler
document.getElementById("file").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data) || !data.every(item => item.post_link)) {
                log("❌ Invalid phase1.json format");
                return;
            }
            chrome.runtime.sendMessage({ type: "LOAD_PHASE1", payload: data }, (response) => {
                if (response.success) {
                    log(`✅ Phase-1 loaded: ${data.length} posts`);
                    updateUI({ running: false, paused: false, progress: `0/${data.length}`, errors: 0, finalCount: 0 });
                } else {
                    log("❌ Failed to load Phase-1");
                }
            });
        } catch (error) {
            log("❌ Error parsing JSON: " + error.message);
        }
    };
    reader.readAsText(file);
};

// Load final.json handler
document.getElementById("final-file").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data)) {
                log("❌ Invalid final.json format - must be an array");
                return;
            }
            chrome.runtime.sendMessage({ type: "LOAD_FINAL", payload: data }, (response) => {
                if (response.success) {
                    log(`✅ Final data loaded: ${data.length} posts`);
                    updateUI({ running: false, paused: false, progress: `${STATE.index}/${STATE.posts.length}`, errors: STATE.errors, finalCount: data.length });
                } else {
                    log("❌ Failed to load final data");
                }
            });
        } catch (error) {
            log("❌ Error parsing final.json: " + error.message);
        }
    };
    reader.readAsText(file);
};

// Button handlers
document.getElementById("start").onclick = () => {
    chrome.runtime.sendMessage({ type: "START_PHASE2" }, (response) => {
        if (response.success) {
            log("▶ Scraping started");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        } else {
            log("❌ " + (response.error || "Failed to start"));
        }
    });
};

document.getElementById("pause").onclick = () => {
    chrome.runtime.sendMessage({ type: "PAUSE_PHASE2" }, (response) => {
        if (response.success) {
            log("⏸ Scraping paused");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        }
    });
};

document.getElementById("resume").onclick = () => {
    chrome.runtime.sendMessage({ type: "RESUME_PHASE2" }, (response) => {
        if (response.success) {
            log("▶ Scraping resumed");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        }
    });
};

document.getElementById("stop").onclick = () => {
    chrome.runtime.sendMessage({ type: "STOP_PHASE2" }, (response) => {
        if (response.success) {
            log("⏹ Scraping stopped");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        }
    });
};

document.getElementById("previous").onclick = () => {
    chrome.runtime.sendMessage({ type: "PREVIOUS_POST" }, (response) => {
        if (response.success) {
            log("⏮ Processing previous post");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        } else {
            log("❌ " + (response.error || "Failed to process previous post"));
        }
    });
};

document.getElementById("next").onclick = () => {
    chrome.runtime.sendMessage({ type: "NEXT_POST" }, (response) => {
        if (response.success) {
            log("⏭ Processing next post");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        } else {
            log("❌ " + (response.error || "Failed to process next post"));
        }
    });
};

document.getElementById("reset").onclick = () => {
    chrome.runtime.sendMessage({ type: "RESET_INDEX" }, (response) => {
        if (response.success) {
            log("🔄 Index reset to 0");
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        } else {
            log("❌ Failed to reset index");
        }
    });
};

// Set Start Index handler
document.getElementById("set-index-btn").onclick = () => {
    const input = document.getElementById("start-index-input");
    const index = parseInt(input.value, 10);

    if (isNaN(index) || index < 0) {
        log("❌ Invalid index. Please enter a positive number.");
        return;
    }

    chrome.runtime.sendMessage({ type: "SET_INDEX", payload: index }, (response) => {
        if (response.success) {
            log(`✅ Start index set to: ${index}`);
            // Force status update
            setTimeout(() => chrome.runtime.sendMessage({ type: "GET_STATUS" }, updateUI), 500);
        } else {
            log("❌ " + (response.error || "Failed to set index"));
        }
    });
};

// Download final.json handler
document.getElementById("download").onclick = () => {
    chrome.runtime.sendMessage({ type: "DOWNLOAD_FINAL" }, (response) => {
        if (response.success) {
            log("💾 Final data downloaded");
        } else {
            log("❌ Failed to download final data");
        }
    });
};

// Update final.json handler (opens data in new tab for manual copy-paste)
document.getElementById("update-final").onclick = () => {
    chrome.runtime.sendMessage({ type: "GET_FINAL_DATA" }, (response) => {
        if (response && response.data) {
            // Create a data URL with the JSON data
            const dataStr = JSON.stringify(response.data, null, 2);
            const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            // Open in new tab
            chrome.tabs.create({ url: dataUrl }, (tab) => {
                log("📝 Opened final.json data in new tab. Copy and paste into data/final.json file.");
            });
        } else {
            log("❌ No data to update");
        }
    });
};

// Periodic status updates
setInterval(() => {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        if (response) updateUI(response);
    });
}, 2000);
