// Content Script for FB Phase-2 Extractor
// Intercepts GraphQL responses to extract post data ONLY

console.log("[FB Extractor] Content script START - URL:", window.location.href);
console.log("[FB Extractor] Content script loaded successfully");

(function () {
    console.log("[FB Extractor] IIFE starting");

    const seenResponses = new Set(); // Prevent duplicate processing
    let postData = null;
    let dataSendTimeout = null;

    function scheduleDataSend() {
        if (dataSendTimeout) clearTimeout(dataSendTimeout);

        // Send data after 2 seconds (faster since we don't wait for comments)
        dataSendTimeout = setTimeout(() => {
            if (postData) {
                console.log("[FB Extractor] Timeout reached, sending post data");
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
                // Also check if response contains post data
                if (this.responseText.includes('post') || this.responseText.includes('story')) {
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
                if (text.includes('post') || text.includes('story')) {
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

    setupDOMObservers();

    // Check for WebSocket connections
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        console.log("[FB Extractor] WebSocket connection detected:", url);
        return new originalWebSocket(url, protocols);
    };

    function checkEmbeddedData() {
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script) => {
            if (script.textContent && (script.textContent.includes('post') || script.textContent.includes('story'))) {
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

    function extractPostDateFromDOM() {
        const timeElements = document.querySelectorAll('time, [data-tooltip-content], [aria-label]');
        for (const el of timeElements) {
            const datetime = el.getAttribute('datetime') || el.getAttribute('data-tooltip-content') || el.getAttribute('aria-label');
            if (datetime) {
                const parsedDate = new Date(datetime);
                if (!isNaN(parsedDate.getTime())) {
                    return Math.floor(parsedDate.getTime() / 1000);
                }
            }
        }
        return null; // Simplified generic date extraction
    }

    function checkElementForData(element) {
        if (element.textContent && (element.textContent.includes('post') || element.textContent.includes('story'))) {
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
        console.log("🚀 [FULL GRAPHQL RESPONSE]:", data);

        // Extract post data ONLY
        if (!postData) {
            const result = extractPostData(data);
            if (result) {
                postData = result.post;
                console.log("👉 [DEBUG] Matched Story Object Found:", postData.id);
                scheduleDataSend();
            }
        }
    }

    function getPostIdFromUrl(url) {
        const match = url.match(/(?:\/posts\/|\/permalink\/|gm\.|fbid=)(\d+)/);
        return match ? match[1] : null;
    }

    function extractPostData(data) {
        let result = null;

        walkObject(data, (obj) => {
            if (result) return;
            if (obj.__typename === 'Story' || obj.story) {
                const story = obj.story || obj;
                if (story.id) {
                    const currentUrlId = getPostIdFromUrl(window.location.href);
                    let isMatch = false;

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

                    if (currentUrlId && !isMatch) {
                        // console.log(`[FB Extractor] Skipping story ${story.id} because it does not match URL ID ${currentUrlId}`);
                        return;
                    }

                    if (isMatch) {
                        console.log("🎯 [FULL MATCHED STORY OBJECT]:", story);
                        post = {
                            id: story.id,
                            author: story.actors?.[0]?.name || 'Unknown',
                            author_id: story.actors?.[0]?.id || 'Unknown',
                            text: cleanText(story.message?.text || ''),
                            timestamp: story.created_time || story.published_time || story.timestamp || story.creation_time || story.publish_time || story.date || extractPostDateFromDOM() || Date.now() / 1000
                        };

                        let timestampMs = post.timestamp;
                        const now = Date.now();
                        const postTime = post.timestamp * 1000;
                        if (postTime <= now + (365 * 24 * 60 * 60 * 1000)) {
                            timestampMs = postTime;
                        }

                        post.date = new Date(timestampMs).toLocaleString('en-US', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                        post.post_type = determinePostType(story);
                        post.hashtags = extractHashtags(post.text);
                        post.post_link = window.location.href;

                        // We are strictly NOT extracting comments as per request
                        post.comment_count = story.comment_count || story.comment_total_count || 0;
                        post.comments = [];

                        result = { post: post, story: story };
                        return;
                    }
                }
            }
        });

        return result;
    }

    function determinePostType(story) {
        if (story.attachments?.[0]?.media) {
            const media = story.attachments[0].media;
            if (media.__typename === 'Photo') return 'image';
            if (media.__typename === 'Video') return 'video';
            if (media.__typename === 'Album') return 'album';
        }
        if (story.event) return 'event';
        if (story.poll) return 'poll';
        if (story.live_video) return 'live';
        return 'text';
    }

    function extractHashtags(text) {
        const hashtagRegex = /#[\w]+/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches : [];
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

    function cleanText(text) {
        if (!text) return "";
        return text.replace(/\s+/g, " ").trim();
    }

    function sendDataToBackground() {
        if (!postData) return;
        if (dataSendTimeout) {
            clearTimeout(dataSendTimeout);
            dataSendTimeout = null;
        }

        console.log("---------------------------------------------------------");
        console.log("📊 [FINAL POST DATA - PASSED] (No Comments):");
        console.log(JSON.stringify(postData, null, 2));
        console.log("---------------------------------------------------------");

        chrome.runtime.sendMessage({
            type: "POST_DATA",
            payload: postData
        });
    }

    // Reset on page navigation
    let currentUrl = window.location.href;
    const pageObserver = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            postData = null;
            seenResponses.clear();
            console.log("[FB Extractor] Page changed, resetting");
        }
    });
    pageObserver.observe(document, { childList: true, subtree: true });

})();
