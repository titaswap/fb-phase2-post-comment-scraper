// Content Script for FB Phase-2 Extractor
// Intercepts GraphQL responses to extract post and comment data

console.log("[FB Extractor] Content script START - URL:", window.location.href);
console.log("[FB Extractor] Content script loaded successfully");

(function () {
    console.log("[FB Extractor] IIFE starting");

    const seenResponses = new Set(); // Prevent duplicate processing
    let CURRENT_POST_ID = null;
    let postData = null;
    let comments = [];
    let dataSendTimeout = null;

    function scheduleDataSend() {
        if (dataSendTimeout) clearTimeout(dataSendTimeout);

        // Send data after 5 seconds of no new activity (longer to collect more comments)
        dataSendTimeout = setTimeout(() => {
            if (postData) {
                console.log("[FB Extractor] Timeout reached, sending available data with", comments.length, "comments");
                sendDataToBackground();
            }
        }, 5000);
    }

    console.log("[FB Extractor] Variables initialized");

    // Intercept XMLHttpRequest
    console.log("[FB Extractor] Setting up XMLHttpRequest interception");
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        //  console.log("[FB Extractor] XMLHttpRequest opened:", method, url);
        if (url.includes('graphql') || url.includes('facebook.com/api') || url.includes('graph.facebook.com')) {
            console.log("[FB Extractor] Potential data request detected:", url);
        }
        this.addEventListener("load", () => {
            if (this.responseText) {
                //  console.log("[FB Extractor] XMLHttpRequest response for:", url, "Size:", this.responseText.length);
                if (url.includes('graphql') || url.includes('facebook.com/api') || url.includes('graph.facebook.com')) {
                    //   console.log("[FB Extractor] Processing potential data response for:", url);
                    try {
                        const data = JSON.parse(this.responseText);
                        processGraphQLResponse(data);
                    } catch (e) {
                        //  console.log("[FB Extractor] Response not JSON or failed to parse:", e.message);
                    }
                }
                // Also check if response contains comment or post data
                if (this.responseText.includes('comment') || this.responseText.includes('post') || this.responseText.includes('message')) {
                    //console.log("[FB Extractor] Response contains potential data, processing anyway");
                    try {
                        const data = JSON.parse(this.responseText);
                        processGraphQLResponse(data);
                    } catch (e) {
                        // Ignore
                    }
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
        console.log("[FB Extractor] Fetch called:", url);
        if (typeof url === 'string' && (url.includes('graphql') || url.includes('facebook.com/api') || url.includes('graph.facebook.com'))) {
            console.log("[FB Extractor] Potential data fetch detected:", url);
        }
        return originalFetch.apply(this, args).then(response => {
            console.log("[FB Extractor] Fetch response for:", url, "Status:", response.status);
            if (args[0] && typeof args[0] === 'string' && (args[0].includes('graphql') || args[0].includes('facebook.com/api') || args[0].includes('graph.facebook.com'))) {
                console.log("[FB Extractor] Processing potential data fetch response for:", args[0]);
                response.clone().text().then(text => {
                    console.log("[FB Extractor] Fetch response text length:", text.length);
                    try {
                        const data = JSON.parse(text);
                        processGraphQLResponse(data);
                    } catch (e) {
                        console.log("[FB Extractor] Fetch response not JSON or failed to parse:", e.message);
                    }
                });
            }
            // Also check fetch responses for data
            response.clone().text().then(text => {
                if (text.includes('comment') || text.includes('post') || text.includes('message')) {
                    console.log("[FB Extractor] Fetch response contains potential data, processing");
                    try {
                        const data = JSON.parse(text);
                        processGraphQLResponse(data);
                    } catch (e) {
                        // Ignore
                    }
                }
            });
            return response;
        });
    };

    console.log("[FB Extractor] All interceptions set up successfully");

    // Wait for DOM to be ready before setting up observers
    function setupDOMObservers() {
        if (!document.body) {
            console.log("[FB Extractor] DOM not ready, waiting...");
            setTimeout(setupDOMObservers, 100);
            return;
        }

        console.log("[FB Extractor] DOM ready, setting up observers");

        // Check for embedded data in HTML and script tags
        console.log("[FB Extractor] Checking for embedded data in page");
        checkEmbeddedData();

        // Monitor DOM changes for dynamic content loading
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

        console.log("[FB Extractor] DOM observers set up successfully");
    }

    setupDOMObservers();

    // Check for WebSocket connections
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        console.log("[FB Extractor] WebSocket connection detected:", url);
        return new originalWebSocket(url, protocols);
    };

    // Add a timeout to check if any requests were intercepted
    setTimeout(() => {
        console.log("[FB Extractor] 5 second check - seen responses count:", seenResponses.size);
        if (seenResponses.size === 0) {
            console.log("[FB Extractor] No responses intercepted yet. Facebook might be using different API or loading data differently.");
        }
    }, 5000);

    function checkEmbeddedData() {
        // Check script tags for JSON data
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script, index) => {
            if (script.textContent) {
                if (script.textContent.includes('comment') || script.textContent.includes('post') || script.textContent.includes('message')) {
                    console.log("[FB Extractor] Found potential data in script tag", index);
                    try {
                        // Try to extract JSON from script content
                        const jsonMatch = script.textContent.match(/(\{.*\}|\[.*\])/s);
                        if (jsonMatch) {
                            const data = JSON.parse(jsonMatch[0]);
                            console.log("[FB Extractor] Parsed data from script:", data);
                            processGraphQLResponse(data);
                        }
                    } catch (e) {
                        console.log("[FB Extractor] Failed to parse script data:", e.message);
                    }
                }
            }
        });

        // Check for data attributes or embedded JSON in HTML
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
            if (el.textContent && (el.textContent.includes('comment') || el.textContent.includes('post'))) {
                console.log("[FB Extractor] Found potential data in element:", el.tagName, el.className);
            }
        });
    }

    function extractPostDateFromDOM() {
        // Try to find post date from DOM elements
        const timeElements = document.querySelectorAll('time, [data-tooltip-content], [aria-label]');
        for (const el of timeElements) {
            const datetime = el.getAttribute('datetime') || el.getAttribute('data-tooltip-content') || el.getAttribute('aria-label');
            if (datetime) {
                console.log("[FB Extractor] Found datetime in DOM:", datetime);
                // Try to parse various date formats
                const parsedDate = new Date(datetime);
                if (!isNaN(parsedDate.getTime())) {
                    const timestamp = Math.floor(parsedDate.getTime() / 1000);
                    console.log("[FB Extractor] Parsed timestamp from DOM:", timestamp);
                    return timestamp;
                }
            }
        }

        // Look for relative time text like "2 hours ago", "3 days ago", etc.
        const relativeTimeSelectors = [
            '[data-tooltip-content*="ago"]',
            '[aria-label*="ago"]',
            'time[datetime]',
            'abbr[data-tooltip-content]',
            'span[data-tooltip-content]'
        ];

        for (const selector of relativeTimeSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const tooltip = el.getAttribute('data-tooltip-content') || el.getAttribute('aria-label') || el.textContent;
                if (tooltip && (tooltip.includes('ago') || tooltip.includes('at') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(tooltip))) {
                    console.log("[FB Extractor] Found relative time:", tooltip);
                    const parsedDate = new Date(tooltip);
                    if (!isNaN(parsedDate.getTime())) {
                        const timestamp = Math.floor(parsedDate.getTime() / 1000);
                        console.log("[FB Extractor] Parsed timestamp from relative time:", timestamp);
                        return timestamp;
                    }
                }
            }
        }

        return null;
    }

    function checkElementForData(element) {
        if (element.textContent && (element.textContent.includes('comment') || element.textContent.includes('post'))) {
            console.log("[FB Extractor] Dynamic element added with potential data:", element.tagName, element.className);
            try {
                const data = JSON.parse(element.textContent);
                processGraphQLResponse(data);
            } catch (e) {
                // Not JSON, ignore
            }
        }
    }

    function processGraphQLResponse(data) {
        if (!data) return;

        const responseStr = JSON.stringify(data);
        if (seenResponses.has(responseStr)) return;
        seenResponses.add(responseStr);

        console.log("[FB Extractor] Processing GraphQL response:", data);

        // Extract post data
        if (!postData) {
            postData = extractPostData(data);
        }

        // Extract comments
        const newComments = extractComments(data);
        if (newComments.length > 0) {
            console.log("[FB Extractor] Found", newComments.length, "comments in this response");

            // Merge comments, avoiding duplicates by ID
            const existingIds = new Set(comments.map(c => c.id));
            const uniqueNewComments = newComments.filter(c => !existingIds.has(c.id));

            if (uniqueNewComments.length > 0) {
                comments = comments.concat(uniqueNewComments);
                console.log("[FB Extractor] Added", uniqueNewComments.length, "unique comments. Total flat comments:", comments.length);
            }
        }

        // Check if we have post data and should send
        if (postData) {
            // Always schedule data send, but with a longer timeout to collect more comments
            scheduleDataSend();
        }
    }

    function extractPostData(data) {
        let post = null;


        walkObject(data, (obj) => {
            if (obj.__typename === 'Story' || obj.story) {
                const story = obj.story || obj;
                if (story.id && story.message) {
                    console.log("👉 [DEBUG] Raw Story Object Found:", story);
                    /*   console.log("[FB Extractor] Story object keys:", Object.keys(story));
                    console.log("[FB Extractor] Story creation_time:", story.creation_time, "publish_time:", story.publish_time);
                    console.log("[FB Extractor] Story full object:", story); */

                    // Extract basic post data
                    post = {
                        id: story.id,
                        author: story.actors?.[0]?.name || 'Unknown',
                        author_id: story.actors?.[0]?.id || 'Unknown',
                        text: cleanText(story.message?.text || ''),
                        timestamp: story.created_time || story.published_time || story.timestamp || story.creation_time || story.publish_time || story.date || extractPostDateFromDOM() || Date.now() / 1000
                    };
                    CURRENT_POST_ID = story.id;
                    console.log("[FB Extractor] Post timestamp raw:", story.creation_time, story.publish_time, "Final timestamp:", post.timestamp);

                    // Add additional fields
                    // Handle Facebook timestamp format issues
                    let timestampMs = post.timestamp;
                    const now = Date.now();
                    const postTime = post.timestamp * 1000;

                    // If multiplying by 1000 gives a date too far in the future (> 1 year from now), don't multiply
                    if (postTime > now + (365 * 24 * 60 * 60 * 1000)) {
                        console.log("[FB Extractor] Post timestamp seems to be in seconds already, not multiplying by 1000");
                        timestampMs = post.timestamp;
                    } else {
                        timestampMs = postTime;
                    }

                    post.date = new Date(timestampMs).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    post.post_type = determinePostType(story);
                    post.hashtags = extractHashtags(post.text);
                    post.post_link = window.location.href;
                    post.comment_count = story.comment_count || story.comment_total_count || 0; // Will be updated later with actual count

                    console.log("[FB Extractor] Extracted post with additional fields:", post);
                    return post;
                }
            }
        });

        return post;
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
    function resolveParentId(obj, postId) {
        // 🥇 reply → reply (সবচেয়ে reliable)
        if (obj.reply_to_comment && obj.reply_to_comment.id) {
            return obj.reply_to_comment.id;
        }

        // 🥈 direct parent comment
        if (obj.comment_parent && obj.comment_parent.id) {
            // যদি parent = post হয় → top level
            if (obj.comment_parent.id === postId) {
                return null;
            }
            return obj.comment_parent.id;
        }

        // 🥉 fallback (পুরনো structure)
        if (
            obj.feedback &&
            obj.feedback.parent_feedback &&
            obj.feedback.parent_feedback.id &&
            obj.feedback.parent_feedback.id !== postId
        ) {
            return obj.feedback.parent_feedback.id;
        }

        // 🟢 otherwise top-level
        return null;
    }


    function extractComments(data) {
        const allComments = [];

        walkObject(data, (obj) => {
            if (obj.__typename === 'Comment' && obj.body?.text) {

                const id = obj.id || obj.legacy_fbid;
                if (!id) return;

                const parentId = resolveParentId(obj, CURRENT_POST_ID);
                if (!CURRENT_POST_ID) {
                    return;
                }
                const ts =
                    obj.created_time ||
                    obj.creation_time ||
                    obj.publish_time ||
                    Math.floor(Date.now() / 1000);

                const comment = {
                    id,
                    author: obj.author?.name || 'Unknown',
                    author_id: obj.author?.id || 'Unknown',
                    text: cleanText(obj.body.text),
                    timestamp: ts,
                    date: new Date(ts * 1000).toLocaleString(),
                    parent_id: parentId,
                    comment_link:
                        obj.url ||
                        `${location.href.split('?')[0]}?comment_id=${id}`,
                    replies: [],

                    // 🧠 OPTIONAL: raw GraphQL object (VERY IMPORTANT for debug)
                    __raw: obj
                };

                console.log(
                    "[PHASE-2] COMMENT",
                    comment.id,
                    parentId
                        ? "↳ reply to " + parentId
                        : "↳ top-level"
                );

                // 🔍 Raw object access example
                console.log(
                    "[PHASE-2] RAW OBJECT FOR",
                    comment.id,
                    obj
                );

                allComments.push(comment);
            }
        });

        return allComments;
    }



    // Helper to clean extracted text
    function cleanText(text) {
        if (!text) return "";
        // Replace newlines and multiple spaces with a single space
        return text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Function to nest comments properly
    function nestComments(flatComments) {
        const map = new Map();
        const roots = [];

        // 1️⃣ First pass: map all comments
        flatComments.forEach(c => {
            c.replies = [];
            map.set(c.id, c);
        });

        // 2️⃣ Second pass: attach to parent
        flatComments.forEach(c => {
            if (c.parent_id && map.has(c.parent_id)) {
                map.get(c.parent_id).replies.push(c);
            } else {
                roots.push(c);
            }
        });

        // 3️⃣ FIX: recursively normalize hierarchy
        function normalize(node) {
            if (!node.replies || node.replies.length === 0) return;
            node.replies.forEach(child => normalize(child));
        }

        roots.forEach(r => normalize(r));
        return roots;
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

    function sendDataToBackground() {
        if (!postData) return;

        // Clear any pending timeout
        if (dataSendTimeout) {
            clearTimeout(dataSendTimeout);
            dataSendTimeout = null;
        }

        // Nest comments properly before sending
        console.log("[FB Extractor] Nesting", comments.length, "flat comments...");
        const nestedComments = nestComments(comments);

        // Update comment count based on actually extracted comments
        postData.comment_count = nestedComments.length;
        postData.comments = nestedComments;

        console.log("[FB Extractor] Sending data - Post:", postData.id, "Nested comments:", nestedComments.length);

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
            comments = [];
            seenResponses.clear();
            CURRENT_POST_ID = null;
            console.log("[FB Extractor] Page changed, resetting");
        }
    });
    pageObserver.observe(document, { childList: true, subtree: true });

})();