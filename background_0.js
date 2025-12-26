// Background Service Worker for FB Phase-2 Extractor

let STATE = {
    posts: [],          // Array of post objects from phase1.json
    index: 0,           // Current post index being processed
    running: false,     // Is the scraper running?
    paused: false,      // Is it paused?
    final: [],          // Collected data
    tabId: null,        // Current tab ID
    errors: 0,          // Error count
    processed: new Set() // Set of processed post IDs to prevent duplicates
};

// Load saved state on startup
chrome.storage.local.get(["phase1", "final", "index", "errors", "processed"], (result) => {
    if (result.phase1) STATE.posts = result.phase1;
    if (result.final) STATE.final = result.final;
    if (result.index !== undefined) STATE.index = result.index;
    if (result.errors !== undefined) STATE.errors = result.errors;
    if (result.processed) STATE.processed = new Set(result.processed);

    console.log("📦 State restored:", {
        posts: STATE.posts.length,
        index: STATE.index,
        final: STATE.final.length,
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
        final: STATE.final,
        index: STATE.index,
        errors: STATE.errors,
        processed: Array.from(STATE.processed)
    });
}

// Auto-save final.json via local server
function autoSaveFinal() {
    if (STATE.final.length > 0) {
        console.log(`🔄 Sending ${STATE.final.length} posts to local server...`);

        // Send data to local server
        fetch('http://localhost:8080/append-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(STATE.final)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(`✅ Data saved to final.json: ${data.appended} new, ${data.duplicatesSkipped} duplicates skipped, Total: ${data.total}`);
                    console.log(`📁 File location: ./data/final.json`);
                } else {
                    console.error('❌ Server error:', data.error);
                }
            })
            .catch(error => {
                console.error('❌ Failed to save to local server:', error.message);
                console.log('💡 Make sure the local server is running: npm start');
                console.log('💡 Fallback: Use "Update final.json" button to manually copy data');
            });
    } else {
        console.log("⚠️ No data to save");
    }
}

// Periodic auto-save during active scraping
let autoSaveInterval = null;

function startPeriodicAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        if (STATE.running && !STATE.paused && STATE.final.length > 0) {
            console.log("⏰ Periodic auto-save triggered...");
            autoSaveFinal();
        }
    }, 10000); // Auto-save every 10 seconds during active scraping
    console.log("🔄 Periodic auto-save started (every 10 seconds)");
}

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
            STATE.final = [];
            STATE.processed = new Set();
            STATE.errors = 0;
            saveState();
            console.log("💾 Phase-1 loaded:", STATE.posts.length);
            sendResponse({ success: true });
            break;

        case "LOAD_FINAL":
            STATE.final = msg.payload;
            // Rebuild processed set from loaded data
            STATE.processed = new Set();
            STATE.final.forEach(item => {
                if (item.post && item.post.id) {
                    STATE.processed.add(item.post.id);
                }
            });
            saveState();
            console.log("💾 Final data loaded:", STATE.final.length, "posts, processed set size:", STATE.processed.size);
            sendResponse({ success: true });
            break;

        case "START_PHASE2":
            if (STATE.posts.length === 0) {
                sendResponse({ error: "No posts loaded. Upload phase1.json first." });
                return;
            }
            STATE.running = true;
            STATE.paused = false;
            startPeriodicAutoSave(); // Start periodic auto-save
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                STATE.tabId = tabs[0].id;
                chrome.sidePanel.open({ windowId: tabs[0].windowId });
                nextPost();
            });
            sendResponse({ success: true });
            break;

        case "PAUSE_PHASE2":
            STATE.paused = true;
            stopPeriodicAutoSave(); // Stop periodic auto-save when paused
            sendResponse({ success: true });
            break;

        case "RESUME_PHASE2":
            STATE.paused = false;
            startPeriodicAutoSave(); // Resume periodic auto-save
            nextPost();
            sendResponse({ success: true });
            break;

        case "STOP_PHASE2":
            STATE.running = false;
            STATE.paused = false;
            stopPeriodicAutoSave(); // Stop periodic auto-save
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

        case "DOWNLOAD_FINAL":
            downloadFinal();
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
            sendResponse({ data: STATE.final });
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
                finalCount: STATE.final.length
            });
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
        // Find existing entry index
        const existingIndex = STATE.final.findIndex(item => item.post && item.post.id === postId);

        if (existingIndex !== -1) {
            const existingPost = STATE.final[existingIndex];
            const oldCommentCount = existingPost.post.comments ? existingPost.post.comments.length : 0;
            const newCommentCount = finalData.post.comments ? finalData.post.comments.length : 0;

            // Update the entry
            STATE.final[existingIndex] = finalData;
            saveState();

            console.log(`🔄 Updated post ${postId}: ${oldCommentCount} -> ${newCommentCount} comments`);

            // Auto-save just in case
            autoSaveFinal();

            // DO NOT call nextPost() here because we already processed this post's navigation 
            // when we first saw it. Calling it again would skip the next post in the queue.
            return;
        }
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

    STATE.final.push(finalData);
    STATE.processed.add(postId);
    saveState();

    console.log(`📊 Data collected: ${STATE.final.length} posts total`);
    autoSaveFinal(); // Auto-save to downloads folder

    console.log(`✅ Processed: ${STATE.final.length}/${STATE.posts.length}`, postId);
    nextPost();
}

// Process next post
function nextPost() {
    if (!STATE.running || STATE.paused) return;

    if (STATE.index >= STATE.posts.length) {
        console.log("🎉 Phase-2 completed!");
        stopPeriodicAutoSave(); // Stop periodic auto-save
        autoSaveFinal(); // Final auto-save
        downloadFinal(); // Manual download as well
        STATE.running = false;
        return;
    }

    const post = STATE.posts[STATE.index++];
    console.log("➡ Loading post:", STATE.index, post.post_link);

    chrome.tabs.update(STATE.tabId, { url: post.post_link }, () => {
        if (chrome.runtime.lastError) {
            console.error("Tab update error:", chrome.runtime.lastError);
            STATE.errors++;
            saveState();
            // Retry after delay
            setTimeout(nextPost, 2000);
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
function downloadFinal() {
    if (STATE.final.length === 0) {
        console.log("No data to download");
        return;
    }

    const blob = new Blob([JSON.stringify(STATE.final, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url: url,
        filename: 'fb-scraper-final-manual.json', // Different filename for manual downloads
        saveAs: true // Allow user to choose location
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            console.log("Manual download failed:", chrome.runtime.lastError.message);
        } else {
            console.log("Manual download started");
            URL.revokeObjectURL(url);
        }
    });
}

// Action click to open side panel
chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent((window) => {
        chrome.sidePanel.open({ windowId: window.id });
    });
});
