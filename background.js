// Background Service Worker for FB Phase-2 Extractor

// Background Service Worker for FB Phase-2 Extractor

const SERVER_URL = 'http://localhost:8080/append-data';

let STATE = {
    posts: [],          // Array of post objects from phase1.json
    index: 0,           // Current post index being processed
    running: false,     // Is the scraper running?
    paused: false,      // Is it paused?
    // final: [],       // REMOVED: No longer storing full data in memory/storage

    tabId: null,        // Current tab ID
    errors: 0,          // Error count
    processed: new Set(), // Set of processed post IDs to prevent duplicates
    processedIds: new Set(), // Set of numeric IDs from server for pre-check
    navigationTimeout: null, // Failsafe timer
    countdownTimer: null, // Timer for anti-ban countdown
    serverTotal: "N/A (Saved on Server)", // Store server total count
    safeMode: false // Safe Mode state
};

// Load saved state on startup
chrome.storage.local.get(["phase1", "final", "index", "errors", "processed"], (result) => {
    if (result.phase1) STATE.posts = result.phase1;
    // if (result.final) STATE.final = result.final; // REMOVED
    if (result.index !== undefined) STATE.index = result.index;
    if (result.errors !== undefined) STATE.errors = result.errors;
    if (result.processed) STATE.processed = new Set(result.processed);
    if (result.safeMode !== undefined) STATE.safeMode = result.safeMode;

    console.log("📦 State restored:", {
        posts: STATE.posts.length,
        index: STATE.index,
        // final: STATE.final.length,
        errors: STATE.errors
    });

    // Show auto-save info
    console.log("💾 Auto-save location: ./data/final.json");
    console.log("🚀 Local server required: Run 'npm start' for auto-save");
    console.log("💡 Alternative: Use 'Update final.json' button for manual copy");
});

// Save state periodically
function saveState() {
    chrome.storage.local.set({
        phase1: STATE.posts,
        // final: STATE.final, // REMOVED: Don't save big data to local storage
        index: STATE.index,
        errors: STATE.errors,
        processed: Array.from(STATE.processed),
        safeMode: STATE.safeMode
    });
}

// Clear any pending navigation timeout
function clearNavigationTimeout() {
    if (STATE.navigationTimeout) {
        clearTimeout(STATE.navigationTimeout);
        STATE.navigationTimeout = null;
    }
}

// Auto-save final.json via local server
// Auto-save is now "Send Immediately"
function sendDataToServer(dataItems) {
    if (dataItems.length > 0) {
        console.log(`🔄 Sending ${dataItems.length} posts to local server...`);

        // Send data to local server
        fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataItems)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(`✅ Data saved to final.json: ${data.appended} new, ${data.duplicatesSkipped} duplicates skipped, Total: ${data.total}`);

                    // Update state
                    STATE.serverTotal = data.total;

                    // Broadcast Server Stats to UI
                    chrome.runtime.sendMessage({
                        type: "SERVER_STATS",
                        payload: {
                            total: data.total,
                            appended: data.appended,
                            duplicates: data.duplicatesSkipped,
                            success: true
                        }
                    }).catch(() => { });

                } else {
                    console.error('❌ Server error:', data.error);

                    chrome.runtime.sendMessage({
                        type: "SERVER_STATS",
                        payload: { error: data.error, success: false }
                    }).catch(() => { });
                }
            })
            .catch(error => {
                console.log('💡 Make sure the local server is running: npm start');
            });
    }
}

// Helper: Extract numeric ID from Facebook URL
function extractNumericId(url) {
    if (!url) return null;
    // Matches /posts/123456789 or /permalink/123456789 or /groups/123/user/123/ (no that's user)
    // Matches /groups/GROUP_ID/posts/POST_ID/
    const match = url.match(/(?:\/posts\/|\/permalink\/|\/groups\/[^/]+\/user\/)(\d+)/);
    // If simple check fails, try matching any large number at end of string
    if (!match) {
        const simpleMatch = url.match(/(\d+)\/?$/);
        return simpleMatch ? simpleMatch[1] : null;
    }
    return match ? match[1] : null;
}

// Fetch all processed IDs from server for deduplication
function fetchServerProcessedIds() {
    return fetch('http://localhost:8080/get-processed-urls')
        .then(response => response.json())
        .then(data => {
            if (data.success && Array.isArray(data.urls)) {
                const countBefore = STATE.processedIds.size;
                data.urls.forEach(url => {
                    const id = extractNumericId(url);
                    if (id) STATE.processedIds.add(id);
                });
                console.log(`📥 Synced ${STATE.processedIds.size} processed IDs from server (New: ${STATE.processedIds.size - countBefore})`);
                return true;
            }
            return false;
        })
        .catch(err => {
            console.error("❌ Failed to sync processed IDs:", err);
            return false;
        });
}

// Periodic auto-save during active scraping
let autoSaveInterval = null;

// Auto-save removed because we send data immediately now
// Keep interval ONLY for heartbeat or other checks if needed, but not for saving 'final' array.
console.log("🔄 Auto-save loop removed (Data is sent immediately)");

function stopPeriodicAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log("⏹️ Periodic auto-save stopped");
    }
}

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
        case "LOAD_PHASE1":
            STATE.posts = msg.payload;
            STATE.index = 0;
            // STATE.final = []; // REMOVED

            STATE.processed = new Set();
            STATE.errors = 0;
            saveState();
            console.log("💾 Phase-1 loaded:", STATE.posts.length);
            sendResponse({ success: true });
            break;

        case "LOAD_FINAL":
            // STATE.final = msg.payload; // We don't load final data back into memory
            // Rebuild processed set from loaded data
            STATE.processed = new Set();
            if (msg.payload && Array.isArray(msg.payload)) {
                msg.payload.forEach(item => {
                    if (item.post && item.post.id) {
                        STATE.processed.add(item.post.id);
                    }
                });
            }
            saveState();
            console.log("💾 Final data processed for history, set size:", STATE.processed.size);
            sendResponse({ success: true });
            break;

        case "START_PHASE2":
            if (STATE.posts.length === 0) {
                sendResponse({ error: "No posts loaded. Upload phase1.json first." });
                return;
            }
            STATE.running = true;
            STATE.paused = false;

            // Allow async response
            // sendResponse({ success: true }); // We will send response after sync ? No, keep it responsive.
            // Actually, we should sync first then start.
            // But we can't await inside this switch easily without returning true.

            // Let's send success immediately, but start logic async
            sendResponse({ success: true });

            fetchServerProcessedIds().then(() => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    STATE.tabId = tabs[0].id;
                    chrome.sidePanel.open({ windowId: tabs[0].windowId });
                    nextPost();
                });
            });
            break;

        case "PAUSE_PHASE2":
            STATE.paused = true;
            stopPeriodicAutoSave();
            clearNavigationTimeout(); // Don't skip if paused
            if (STATE.countdownTimer) {
                clearInterval(STATE.countdownTimer);
                STATE.countdownTimer = null;
                // Notify UI that we paused during countdown?
                chrome.runtime.sendMessage({ type: "COUNTDOWN_UPDATE", payload: 0 }).catch(() => { });
            }
            sendResponse({ success: true });
            break;

        case "RESUME_PHASE2":
            STATE.paused = false;
            // startPeriodicAutoSave();
            nextPost();
            sendResponse({ success: true });
            break;

        case "STOP_PHASE2":
            STATE.running = false;
            STATE.paused = false;
            stopPeriodicAutoSave();
            clearNavigationTimeout();
            if (STATE.countdownTimer) {
                clearInterval(STATE.countdownTimer);
                STATE.countdownTimer = null;
            }
            saveState();
            sendResponse({ success: true });
            break;

        case "PREVIOUS_POST":
            if (STATE.posts.length === 0) {
                sendResponse({ error: "No posts loaded. Upload phase1.json first." });
                return;
            }
            // Process previous post
            processPreviousPost();
            sendResponse({ success: true });
            break;

        case "NEXT_POST":
            if (STATE.posts.length === 0) {
                sendResponse({ error: "No posts loaded. Upload phase1.json first." });
                return;
            }
            // Process just one post
            processNextPost();
            sendResponse({ success: true });
            break;

        case "RESET_INDEX":
            STATE.index = 0;
            STATE.processed = new Set(); // Also clear processed posts so they can be re-processed
            STATE.errors = 0;
            saveState();
            console.log("🔄 Index reset to 0, processed posts cleared");
            sendResponse({ success: true });
            break;



        case "SET_INDEX":
            const newIndex = msg.payload;
            if (typeof newIndex !== "number" || newIndex < 0) {
                sendResponse({ error: "Invalid index" });
                return;
            }
            if (!STATE.posts || STATE.posts.length === 0) {
                sendResponse({ error: "No posts loaded. Upload phase1.json first." });
                return;
            }
            if (newIndex >= STATE.posts.length) {
                sendResponse({ error: `Index too large. Max is ${STATE.posts.length - 1}` });
                return;
            }

            STATE.index = newIndex;
            // Removed: STATE.processed = new Set(); // Keep processed history? Or clear? 
            // User likely wants to skip already processed ones, so keeping history is safer.
            // But if they manually set index back, maybe they WANT to re-process.
            // Let's NOT clear processed, but simply respect the manual index move.
            // If they want to re-process an existing one, they are moving the index, so be it.
            // But handlePostData checks processed set. 
            // If user forces index back to 5, and 5 is in processed, it will be skipped.
            // So if they want to RE-process 5, we should probably allow it?
            // For now, let's just move the index. If they need to re-process, they can clear final.json or use Reset.

            saveState();
            console.log("📍 Index manually set to:", STATE.index);
            sendResponse({ success: true });
            break;

        case "GET_FINAL_DATA":
            sendResponse({ data: [] }); // We don't have the data anymore
            break;

        case "POST_DATA":
            handlePostData(msg.payload);
            sendResponse({ success: true });
            break;

        case "GET_STATUS":
            sendResponse({
                running: STATE.running,
                paused: STATE.paused,
                progress: `${STATE.index}/${STATE.posts.length}`,
                errors: STATE.errors,
                finalCount: STATE.serverTotal,
                serverUrl: SERVER_URL,
                safeMode: STATE.safeMode
            });
            break;

        case "TOGGLE_SAFE_MODE":
            STATE.safeMode = msg.payload;
            saveState();
            console.log(`🛡️ Safe Mode set to: ${STATE.safeMode}`);
            sendResponse({ success: true });
            break;
    }
});

function normalizeCommentDates(comments) {
    comments.forEach(c => {
        if (!c.date && c.timestamp) {
            const ts = c.timestamp * 1000;
            c.timestamp_readable = new Date(ts).toLocaleString();
        }
        if (c.replies && c.replies.length > 0) {
            normalizeCommentDates(c.replies);
        }
    });
}

// Handle incoming post data from content script
function handlePostData(data) {
    // Data received! Clear the timeout.
    clearNavigationTimeout();

    // Wrap data if it's not already wrapped (content.js sends flat post object)
    const finalData = data.post ? data : {
        post: data,
        url: data.post_link || "",
        captured_at: new Date().toISOString()
    };

    const postId = finalData.post?.id;

    if (!postId) {
        console.error("Error: Received post data without ID", finalData);
        return;
    }

    // Check if post already exists (Duplicate or Update)
    if (STATE.processed.has(postId)) {
        console.log(`⚠️ Post ${postId} already processed. Sending update to server anyway.`);
        // We just send it to server, let server handle deduplication logic or update logic if it could.
        // But since we are "appending", we might just send it.
        // Ideally we should check if we really need to send it.
        // For now, let's allow re-sending so server can decide (or we just skip).
        // If you want strict skipping:
        // return; 
    }


    // Reference to the post object for timestamp conversion
    const post = finalData.post;

    // Convert timestamps if not already converted
    if (!post.date && post.timestamp) {
        const timestampMs = post.timestamp * 1000;
        const postDate = new Date(timestampMs);
        const now = Date.now();

        // If the date is too far in the future, try without multiplying
        if (timestampMs > now + (365 * 24 * 60 * 60 * 1000)) {
            post.timestamp_readable = new Date(post.timestamp).toLocaleString();
        } else {
            post.timestamp_readable = postDate.toLocaleString();
        }
    }

    // Handle nested comments
    if (post.comments) {
        normalizeCommentDates(post.comments);
    }

    // STATE.final.push(finalData); // REMOVED
    STATE.processed.add(postId);
    saveState();

    console.log(`📊 Data collected for post ${postId}`);
    sendDataToServer([finalData]); // Send IMMEDIATELY to server

    console.log(`✅ Processed: ${STATE.index}/${STATE.posts.length}`, postId);

    // Anti-ban system: Random delay before next post
    // Anti-ban system: Random delay before next post
    // Normal: 10-30s | Safe Mode: 30-60s
    let minDelay = 10000;
    let maxDelay = 30000;

    if (STATE.safeMode) {
        minDelay = 30000; // 30 seconds
        maxDelay = 60000; // 60 seconds
        console.log("🛡️ Safe Mode Active: Extended delay enabled.");
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next post (Anti-ban protection)...`);

    startCountdown(delay, nextPost);
}

// Helper: Start countdown with UI updates
function startCountdown(durationMs, onComplete) {
    let remaining = Math.ceil(durationMs / 1000);

    // Clear any existing timer
    if (STATE.countdownTimer) clearInterval(STATE.countdownTimer);

    // Initial broadcast
    chrome.runtime.sendMessage({ type: "COUNTDOWN_UPDATE", payload: remaining }).catch(() => { });

    STATE.countdownTimer = setInterval(() => {
        remaining--;

        // Broadcast update
        chrome.runtime.sendMessage({ type: "COUNTDOWN_UPDATE", payload: remaining }).catch(() => { });

        if (remaining <= 0) {
            clearInterval(STATE.countdownTimer);
            STATE.countdownTimer = null;
            onComplete();
        }
    }, 1000);
}

// Process next post
function nextPost() {
    if (!STATE.running || STATE.paused) return;

    if (STATE.index >= STATE.posts.length) {
        console.log("🎉 Phase-2 completed!");
        stopPeriodicAutoSave(); // Stop periodic auto-save
        // autoSaveFinal(); // REMOVED
        // downloadFinal(); // REMOVED
        STATE.running = false;
        return;
    }

    const post = STATE.posts[STATE.index]; // Don't increment yet, wait until we decide to process

    // Check Deduplication
    const numericId = extractNumericId(post.post_link);
    if (numericId && STATE.processedIds.has(numericId)) {
        console.log(`⏭️ Skipping Duplicate Post: ${numericId}`);
        // Log to UI
        chrome.runtime.sendMessage({
            type: "LOG_MESSAGE",
            payload: `⏭️ Skipping duplicate: ${numericId}`
        }).catch(() => { });

        STATE.index++; // Move to next
        saveState();

        // Immediate next (with small delay to prevent stack overflow loop)
        setTimeout(nextPost, 10);
        return;
    }

    // If we are here, we are processing this post
    STATE.index++;
    console.log("➡ Loading post:", STATE.index, post.post_link);

    // Set 60s failsafe timeout
    clearNavigationTimeout();
    STATE.navigationTimeout = setTimeout(() => {
        if (STATE.running && !STATE.paused) {
            console.error("⏳ Timeout detected for post:", post.post_link, "- Moving to next.");
            STATE.errors++;
            saveState();

            // Notify UI of Timeout
            chrome.runtime.sendMessage({ type: "COUNTDOWN_UPDATE", payload: "Timeout! Skipping..." }).catch(() => { });

            // Use countdown even for timeouts (Anti-ban safety + consistency)
            let minDelay = 10000;
            let maxDelay = 30000;

            if (STATE.safeMode) {
                minDelay = 30000;
                maxDelay = 60000;
            }

            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            startCountdown(delay, nextPost);
        }
    }, 30000); // 30 seconds timeout (Increased for better reliability on slow connections)

    // Notify UI: Scraping Started
    chrome.runtime.sendMessage({ type: "COUNTDOWN_UPDATE", payload: "Scraping..." }).catch(() => { });

    chrome.tabs.update(STATE.tabId, { url: post.post_link }, () => {
        if (chrome.runtime.lastError) {
            console.error("Tab update error:", chrome.runtime.lastError);
            STATE.errors++;
            saveState();
            // Retry after delay (Standard countdown)
            const delay = 5000; // Short 5s delay for errors
            chrome.runtime.sendMessage({ type: "COUNTDOWN_UPDATE", payload: "Error! Retrying..." }).catch(() => { });
            startCountdown(delay, nextPost);
        }
    });
}

// Process just one post (for Next button)
function processNextPost() {
    if (STATE.index >= STATE.posts.length) {
        console.log("🎉 All posts processed!");
        return;
    }

    const post = STATE.posts[STATE.index++];
    console.log("➡ Loading single post:", STATE.index, post.post_link);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.sidePanel.open({ windowId: tabs[0].windowId });

        chrome.tabs.update(tabId, { url: post.post_link }, () => {
            if (chrome.runtime.lastError) {
                console.error("Tab update error:", chrome.runtime.lastError);
                STATE.errors++;
                saveState();
            }
        });
    });
}

// Process previous post
function processPreviousPost() {
    if (STATE.index <= 0) {
        console.log("⚠ Already at the first post!");
        return;
    }

    STATE.index--; // Decrement index to go to previous post
    const post = STATE.posts[STATE.index];
    console.log("⬅ Loading previous post:", STATE.index + 1, post.post_link);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.sidePanel.open({ windowId: tabs[0].windowId });

        chrome.tabs.update(tabId, { url: post.post_link }, () => {
            if (chrome.runtime.lastError) {
                console.error("Tab update error:", chrome.runtime.lastError);
                STATE.errors++;
                saveState();
            }
        });
    });
}

// Download final.json (manual download)
// Download function removed - Data is stored on server only


// Action click to open side panel
chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent((window) => {
        chrome.sidePanel.open({ windowId: window.id });
    });
});
