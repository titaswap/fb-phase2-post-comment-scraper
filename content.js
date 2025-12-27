// Content Script for FB Phase-2 Extractor
// Intercepts GraphQL responses and sends the RAW MATCHED post object directly, 
// AND appends raw comment objects if they are found separately.

console.log("[FB Extractor] Content script START - URL:", window.location.href);
console.log("[FB Extractor] Content script loaded successfully");

(function () {
    function enableLiteMode() {
        if (document.getElementById("fb-lite-mode-style")) return;

        /* =========================
           1️⃣ CSS LITE MODE
        ========================= */
        const style = document.createElement("style");
        style.id = "fb-lite-mode-style";
        style.textContent = `
        /* ---- Hide heavy UI ---- */
        [role="navigation"],
        [data-pagelet^="LeftRail"],
        [data-pagelet^="RightRail"],
        [data-pagelet^="Stories"],
        [data-pagelet^="Reels"],
        [data-pagelet^="Chat"],
        [data-pagelet^="VideoChat"],
        [aria-label="Create a post"],
        iframe,
        video {
            display: none !important;
        }

        /* ---- Kill animations & transitions ---- */
        * {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
        }

        /* ---- Reduce image cost ---- */
        img {
            max-height: 900px !important;
        }
    `;
        document.documentElement.appendChild(style);

        /* =========================
           2️⃣ RUNTIME DOM CLEANUP
        ========================= */
        const cleanupInterval = setInterval(() => {
            // Remove videos that load later
            document.querySelectorAll("video").forEach(v => v.remove());

            // Remove chat, stories, reels that appear dynamically
            document.querySelectorAll(
                '[data-pagelet^="Chat"], [data-pagelet^="Stories"], [data-pagelet^="Reels"], iframe'
            ).forEach(el => el.remove());

            // Make images lighter
            document.querySelectorAll("img").forEach(img => {
                img.loading = "lazy";
                img.decoding = "async";
            });

        }, 3000);

        /* =========================
           3️⃣ POST-FOCUSED MODE (Phase-2)
        ========================= */
        setTimeout(() => {
            const articles = document.querySelectorAll('[role="article"]');
            if (articles.length > 1) {
                articles.forEach((el, i) => {
                    if (i < articles.length - 1) el.remove();
                });
            }
        }, 5000);

        console.log("⚡ FB Lite Mode ENABLED");

        // return cleanup handler if ever needed
        return () => clearInterval(cleanupInterval);
    }
    document.addEventListener("DOMContentLoaded", enableLiteMode);
    enableLiteMode();






    console.log("[FB Extractor] IIFE starting");

    const seenResponses = new Set(); // Prevent duplicate processing

    // State variables
    let CURRENT_POST_ID = null;
    let extractedRawPost = null;
    let extractedRawComments = []; // Array to store raw comment objects found
    let dataSendTimeout = null;

    function scheduleDataSend() {
        if (dataSendTimeout) clearTimeout(dataSendTimeout);

        // Send data after 4 seconds of no new activity
        dataSendTimeout = setTimeout(() => {
            if (extractedRawPost || extractedRawComments.length > 0) {
                console.log("[FB Extractor] Timeout reached, sending RAW matched post data...");
                sendDataToBackground();
            }
        }, 2000);
    }

    console.log("[FB Extractor] Variables initialized");

    // Intercept XMLHttpRequest
    console.log("[FB Extractor] Setting up XMLHttpRequest interception");
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.addEventListener("load", () => {
            if (this.responseText) {
                if (url.includes('graphql') || url.includes('facebook.com/api') || url.includes('graph.facebook.com')) {
                    try {
                        const data = JSON.parse(this.responseText);
                        processGraphQLResponse(data);
                    } catch (e) { }
                }
                // Also check if response contains data of interest
                if (this.responseText.includes('story') || this.responseText.includes('post') || this.responseText.includes('comment')) {
                    try {
                        const data = JSON.parse(this.responseText);
                        processGraphQLResponse(data);
                    } catch (e) { }
                }
            }
        });
        return originalOpen.apply(this, arguments);
    };

    // Intercept fetch
    console.log("[FB Extractor] Setting up fetch interception");
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        const url = args[0];
        return originalFetch.apply(this, args).then(response => {
            if (args[0] && typeof args[0] === 'string' && (args[0].includes('graphql') || args[0].includes('facebook.com/api') || args[0].includes('graph.facebook.com'))) {
                response.clone().text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        processGraphQLResponse(data);
                    } catch (e) { }
                });
            }
            // Also check fetch responses for data
            response.clone().text().then(text => {
                if (text.includes('story') || text.includes('post') || text.includes('comment')) {
                    try {
                        const data = JSON.parse(text);
                        processGraphQLResponse(data);
                    } catch (e) { }
                }
            });
            return response;
        });
    };

    console.log("[FB Extractor] All interceptions set up successfully");

    // Wait for DOM to be ready before setting up observers
    function setupDOMObservers() {
        if (!document.body) {
            setTimeout(setupDOMObservers, 100);
            return;
        }

        console.log("[FB Extractor] DOM ready, setting up observers");
        checkEmbeddedData();

        const dataObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            checkElementForData(node);
                        }
                    });
                }
            });
        });
        dataObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Initial check of existing DOM elements
    checkEmbeddedData();

    // Observers to catch dynamically added content
    function setupDOMObservers() {
        console.log("[FB Extractor] Setting up DOM observers");

        // Observe script tags (often used for initial data hydration)
        const scriptObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT') {
                        checkElementForData(node);
                    }
                });
            });
        });
        scriptObserver.observe(document.documentElement, { childList: true, subtree: true });

        // Observe main body for text content changes (less reliable but fallback)
        /* 
        const dataObserver = new MutationObserver((mutations) => {
             // ... existing logic ... 
        });
        dataObserver.observe(document.body, { childList: true, subtree: true });
        */

        // Instead of heavy body observer, just check periodically if missed
        setInterval(checkEmbeddedData, 2000);
    }

    setupDOMObservers();

    // Run immediate check again after small delay to catch hydration
    setTimeout(checkEmbeddedData, 1000);
    setTimeout(checkEmbeddedData, 3000);

    // Check for WebSocket connections
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        console.log("[FB Extractor] WebSocket connection detected:", url);
        return new originalWebSocket(url, protocols);
    };

    function checkEmbeddedData() {
        // Check script tags for JSON data
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script) => {
            if (script.textContent && (script.textContent.includes('story') || script.textContent.includes('post') || script.textContent.includes('comment'))) {
                try {
                    const jsonMatch = script.textContent.match(/(\{.*\}|\[.*\])/s);
                    if (jsonMatch) {
                        const data = JSON.parse(jsonMatch[0]);
                        processGraphQLResponse(data);
                    }
                } catch (e) { }
            }
        });
    }

    function checkElementForData(element) {
        if (element.textContent && (element.textContent.includes('story') || element.textContent.includes('post') || element.textContent.includes('comment'))) {
            try {
                const data = JSON.parse(element.textContent);
                processGraphQLResponse(data);
            } catch (e) { }
        }
    }

    function processGraphQLResponse(data) {
        if (!data) return;

        const responseStr = JSON.stringify(data);
        if (seenResponses.has(responseStr)) return;
        seenResponses.add(responseStr);

        // 1. Extract RAW Post Data (Story Object)
        if (!extractedRawPost) {
            const result = extractRawPostData(data);
            if (result) {
                extractedRawPost = result;
                CURRENT_POST_ID = result.id;
                console.log("👉 [DEBUG] Matched RAW Story Object Found:", result.id);
                scheduleDataSend();
            }
        }

        // 2. Extract RAW Comment Objects
        // We look for any object that has __typename === 'Comment'
        const commentsFound = [];
        walkObject(data, (obj) => {
            if (obj.__typename === "Comment" && obj.id) {
                // Avoid duplicates if possible, or just raw collect
                const isDuplicate = extractedRawComments.some(c => c.id === obj.id);
                if (!isDuplicate) {
                    extractedRawComments.push(obj);
                    commentsFound.push(obj);
                }
            }
        });

        if (commentsFound.length > 0) {
            console.log("👉 [DEBUG] Found", commentsFound.length, "RAW Comment objects");
            scheduleDataSend();
        }

    }

    // --- Helper Functions ---

    function getPostIdFromUrl(url) {
        const match = url.match(/(?:\/posts\/|\/permalink\/|gm\.|fbid=)(\d+)/);
        return match ? match[1] : null;
    }

    function walkObject(obj, callback) {
        if (!obj || typeof obj !== 'object') return;
        callback(obj);
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                walkObject(obj[key], callback);
            }
        }
    }

    function extractRawPostData(data) {
        let foundStory = null;

        walkObject(data, (obj) => {
            if (foundStory) return;
            // Look for the 'Story' typename or an object that looks like the main story
            if (obj.__typename === 'Story' || obj.story) {
                const story = obj.story || obj;
                if (story.id) {
                    const currentUrlId = getPostIdFromUrl(window.location.href);
                    let isMatch = false;

                    // Match logic
                    if (story.id === currentUrlId) isMatch = true;
                    if (!isMatch && story.post_id && story.post_id === currentUrlId) isMatch = true;
                    if (!isMatch && currentUrlId) {
                        try {
                            const decodedId = atob(story.id);
                            if (decodedId.includes(currentUrlId)) isMatch = true;
                        } catch (e) { }
                    }
                    if (!isMatch && story.url && typeof story.url === 'string' && story.url.includes(currentUrlId)) {
                        isMatch = true;
                    }

                    // Relaxed Match: If on a post page and we haven't found a match, take the first substantial story
                    if (!isMatch && !extractedRawPost && currentUrlId) {
                        if (story.message || story.actors || story.comet_sections) {
                            isMatch = true;
                            console.log("⚠️ [FB Extractor] Strict ID match failed, using fallback match for:", story.id);
                        }
                    }

                    if (isMatch) {
                        console.log("🎯 [FULL MATCHED RAW STORY OBJECT]:", story);
                        // RETURN THE RAW STORY OBJECT DIRECTLY
                        foundStory = story;
                    }
                }
            }
        });

        return foundStory;
    }

    // --- Send Function ---

    function sendDataToBackground() {
        if (dataSendTimeout) {
            clearTimeout(dataSendTimeout);
            dataSendTimeout = null;
        }

        // Prepare Final Payload
        let finalPayload = {};

        if (extractedRawPost) {
            // If we have a post, use it as the base
            finalPayload = extractedRawPost;

            // Attach our raw comments array to it, effectively appending them.
            // We use a specific key so it's clear these are "Appended Raw Comments".
            // Or as user requested: "post er niche appeand hobe" -> putting them in a list inside the object.
            finalPayload.extracted_raw_comments = extractedRawComments;

        } else if (extractedRawComments.length > 0) {
            // No post found yet, but we have comments. Send what we have.
            console.log("⚠️ Post object missing, sending only raw comments.");
            finalPayload = {
                id: CURRENT_POST_ID || "unknown_post_id",
                missing_post_object: true,
                extracted_raw_comments: extractedRawComments
            };
        } else {
            return; // Nothing to send
        }

        console.log("---------------------------------------------------------");
        console.log("📊 [FINAL RAW DATA SENT] (Post + " + extractedRawComments.length + " raw comments):");
        // console.log(finalPayload); 
        console.log("---------------------------------------------------------");

        chrome.runtime.sendMessage({
            type: "POST_DATA",
            payload: finalPayload
        });
    }

    // Reset on page navigation
    let currentUrl = window.location.href;
    const pageObserver = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;

            // Reset state
            extractedRawPost = null;
            extractedRawComments = [];
            CURRENT_POST_ID = null;
            seenResponses.clear();

            console.log("[FB Extractor] Page changed, resetting");
        }
    });
    pageObserver.observe(document, { childList: true, subtree: true });

})();
