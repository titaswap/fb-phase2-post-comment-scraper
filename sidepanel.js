// Side Panel Script for FB Phase-2 Extractor
// View Logic - Driven by Background State

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const errorsEl = document.getElementById("errors");
const finalCountEl = document.getElementById("final-count");

// Utility functions
const log = msg => {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry = `[${timestamp}] ${msg}`;

    const currentText = logEl.textContent;
    // Split by newline and filter out empty strings to avoid phantom lines
    let lines = currentText.split('\n').filter(line => line.trim() !== '');

    lines.push(newEntry);

    // Keep only the last 20 lines
    if (lines.length > 20) {
        lines = lines.slice(lines.length - 20);
    }

    logEl.textContent = lines.join('\n') + '\n';
    logEl.scrollTop = logEl.scrollHeight;
};
const debug = log; // Debug alias

// Main UI Update Function
const updateUI = (status) => {
    if (!status) return;

    // 1. Run State
    const runState = status.running ? (status.paused ? "Paused" : "Running") : "Idle";
    statusEl.textContent = runState;
    statusEl.className = status.running ? (status.paused ? "paused" : "running") : "status";

    // 2. Progress Bar
    let current = 0;
    let total = 0;
    if (status.progress) {
        const parts = status.progress.split('/');
        if (parts.length === 2) {
            current = parseInt(parts[0]) || 0;
            total = parseInt(parts[1]) || 0;
        }
    }
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    document.getElementById("progress-fill").style.width = `${percent}%`;
    document.getElementById("progress-percent-text").textContent = `${percent}%`;
    document.getElementById("progress-fraction").textContent = `${current} / ${total}`;

    // 3. Stats & Info
    errorsEl.textContent = `Errors: ${status.errors || 0}`;
    finalCountEl.textContent = `Collected: ${status.finalCount !== undefined ? status.finalCount : "0"}`;

    // 4. Server Health
    // Managed independently by checkDirectServerHealth() polling
    // Do NOT overwrite with stale background status 

    // 5. Button States
    const isRunning = status.running;
    const isPaused = status.paused;

    document.getElementById("start").disabled = isRunning;
    document.getElementById("pause").disabled = !isRunning || isPaused;
    document.getElementById("resume").disabled = !isRunning || !isPaused;
    document.getElementById("stop").disabled = !isRunning;

    // 6. Config Inputs (Disabled while running)
    const inputsDisabled = isRunning;
    const ids = ["previous", "next", "reset", "set-index-btn", "start-index-input", "file", "final-file", "min-delay", "max-delay"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = inputsDisabled;
    });

    // 7. Safe Mode Removed
    // (Logic deleted)

    // 8. Delay Inputs
    const minDelayInput = document.getElementById("min-delay");
    const maxDelayInput = document.getElementById("max-delay");

    if (minDelayInput && status.minDelay !== undefined) minDelayInput.value = status.minDelay;
    if (maxDelayInput && status.maxDelay !== undefined) maxDelayInput.value = status.maxDelay;
};

// ... (Existing code) ...

// Delay Input Handlers
document.getElementById("min-delay").onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) chrome.runtime.sendMessage({ type: "UPDATE_DELAY_SETTINGS", payload: { min: val } });
};

document.getElementById("max-delay").onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) chrome.runtime.sendMessage({ type: "UPDATE_DELAY_SETTINGS", payload: { max: val } });
};

// Check Status Immediately
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





// Connection Logic REMOVED

// --- Hybrid Update Strategy ---

// ----------------------------------------------------
// STORAGE-BASED UI UPDATE (MV3 Compliant)
// ----------------------------------------------------

// ----------------------------------------------------
// LOCAL COUNTDOWN TIMER (MV3 Compliant - UI Side)
// ----------------------------------------------------
let localCountdownTimer = null;

function handleCountdown(state) {
    // Clear existing timer if any
    if (localCountdownTimer) {
        clearInterval(localCountdownTimer);
        localCountdownTimer = null;
    }

    if (state.countdownTarget) {
        const target = state.countdownTarget;

        // Start local interval to update UI
        localCountdownTimer = setInterval(() => {
            const now = Date.now();
            const remainingMs = target - now;
            const remainingSec = Math.ceil(remainingMs / 1000);

            if (remainingSec <= 0) {
                // Done
                updateCountdown({ countdown: 0 }); // Show 0 or Ready
                clearInterval(localCountdownTimer);
                localCountdownTimer = null;
            } else {
                updateCountdown({ countdown: remainingSec });
            }
        }, 200); // 5fps update for smoothness

        // Immediate update
        const now = Date.now();
        const remainingMs = target - now;
        const remainingSec = Math.ceil(remainingMs / 1000);
        updateCountdown({ countdown: remainingSec > 0 ? remainingSec : 0 });

    } else {
        // No active countdown
        updateCountdown({ countdown: null });
    }
}

// 1. Listen for State Changes (Even if SW sleeps, storage persists)
chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.ui_state) {
        const state = changes.ui_state.newValue;
        // console.log("🔥 UI STATE CHANGE:", state); // DEBUG
        updateUI(state);
        // updateCountdown(state); // Handled by handleCountdown
        handleCountdown(state);
    }
});

// 2. Initial Load
chrome.storage.local.get('ui_state', (res) => {
    if (res.ui_state) {
        updateUI(res.ui_state);
        // updateCountdown(res.ui_state); // Handled by handleCountdown
        handleCountdown(res.ui_state);
    }
});

// 2. Direct Server Health Check (Decoupled from Background)
async function checkDirectServerHealth() {
    const healthEl = document.getElementById("server-health");
    if (!healthEl) return;

    debug("Server health check"); // Added debug call

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

        const response = await fetch("http://localhost:8080/health", {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            healthEl.textContent = "● Online";
            healthEl.className = "online";
        } else {
            throw new Error("Not OK");
        }
    } catch (error) {
        healthEl.textContent = "● Offline";
        healthEl.className = "offline";
    }
}

setInterval(checkDirectServerHealth, 2000); // Check every 2 seconds
checkDirectServerHealth(); // Initial check


// 3. Active Polling (PULL) - REMOVED
// We now rely solely on the Port (PUSH) mechanism.

// 4. Initial Pull
setTimeout(() => {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        if (response) updateUI(response);
    });
}, 100);


// Helper: Countdown Logic
// Helper: Countdown Logic
function updateCountdown(status) {
    if (!status) return; // Guard clause
    const countdownEl = document.getElementById("countdown");
    if (!countdownEl) return;

    // Use the `countdown` value from status if available
    const val = status.countdown;
    // console.log("⏳ Countdown update:", val); // DEBUG

    // Reset classes
    countdownEl.classList.remove("active", "processing");
    countdownEl.style.color = ""; // Clear inline styles

    if (val === undefined || val === null) {
        if (status.running && !status.paused) {
            // It's processing
            countdownEl.textContent = "Processing...";
            countdownEl.classList.add("processing");
        } else if (status.paused) {
            countdownEl.textContent = "⏸ Paused";
            countdownEl.style.color = "#f59e0b";
        } else {
            countdownEl.textContent = "Ready";
            countdownEl.style.color = "#94a3b8";
        }
    } else {
        // Active numeric countdown
        countdownEl.textContent = `Next in ${val}s`;
        countdownEl.classList.add("active"); // pulses green bg

        // Urgent color override
        if (val <= 5) {
            countdownEl.style.color = "#ef4444";
            countdownEl.style.borderColor = "#ef4444";
            countdownEl.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        }
    }
}
