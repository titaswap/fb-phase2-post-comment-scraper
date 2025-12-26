// Content Script for FB Phase-2 Extractor
// Intercepts GraphQL responses to extract post and comment data

console.log("[FB Extractor] Content script START - URL:", window.location.href);
console.log("[FB Extractor] Content script loaded successfully");

(function () {
    console.log("[FB Extractor] IIFE starting");

    const seenResponses = new Set(); // Prevent duplicate processing
    let postData = null;
    let comments = [];
    let processed = false;
    let dataSendTimeout = null;

    function scheduleDataSend() {
        if (dataSendTimeout) clearTimeout(dataSendTimeout);

        // Send data after 5 seconds of no new activity (longer to collect more comments)
        dataSendTimeout = setTimeout(() => {
            if (postData && !processed) {
                console.log("[FB Extractor] Timeout reached, sending available data with", comments.length, "comments");
                sendDataToBackground();
            }
        }, 5000);
    }

    console.log("[FB Extractor] Variables initialized");

    // Intercept XMLHttpRequest
    // console.log("[FB Extractor] Setting up XMLHttpRequest interception");
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        //  console.log("[FB Extractor] XMLHttpRequest opened:", method, url);
        if (url.includes('graphql') || url.includes('facebook.com/api') || url.includes('graph.facebook.com')) {
            // console.log("[FB Extractor] Potential data request detected:", url);
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
            // console.log("[FB Extractor] Potential data fetch detected:", url);
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
        if (!data || processed) return;

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

    function extractComments(data) {
        const allComments = []; // Store all comments (top-level and replies)

        walkObject(data, (obj) => {
            if (obj.__typename === 'Comment' && obj.body) {
                const comment = {
                    id: obj.id || obj.legacy_fbid,
                    author: obj.author?.name || 'Unknown',
                    author_id: obj.author?.id || 'Unknown',
                    text: cleanText(obj.body?.text || ''),
                    timestamp: obj.created_time || obj.published_time || obj.timestamp || obj.creation_time || obj.publish_time || obj.date || Date.now() / 1000,
                    parent_id: obj.parent_comment_id || obj.parent_comment?.id || obj.reply_to_comment?.id || null,
                    comment_link: obj.url || (window.location.href.split('?')[0] + '?comment_id=' + (obj.id || obj.legacy_fbid)),
                    replies: [] // Will be populated later
                };

                // Add date field to comment
                let commentTimestampMs = comment.timestamp;
                const commentTime = comment.timestamp * 1000;
                const now = Date.now();

                if (commentTime > now + (365 * 24 * 60 * 60 * 1000)) {
                    commentTimestampMs = comment.timestamp;
                } else {
                    commentTimestampMs = commentTime;
                }

                comment.date = new Date(commentTimestampMs).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                console.log("[FB Extractor] Found comment:", comment.id, "Parent:", comment.parent_id, "Text:", comment.text.substring(0, 30) + "...");
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
        const commentMap = new Map();
        const topLevelComments = [];

        // First pass: create map of all comments
        flatComments.forEach(comment => {
            comment.replies = []; // Ensure replies array exists
            commentMap.set(comment.id, comment);
        });

        // Second pass: nest replies under their parents
        flatComments.forEach(comment => {
            if (comment.parent_id && commentMap.has(comment.parent_id)) {
                // This is a reply, add it to parent's replies
                const parent = commentMap.get(comment.parent_id);
                parent.replies.push(comment);
                console.log("[FB Extractor] Nested reply", comment.id, "under parent", comment.parent_id);
            } else {
                // This is a top-level comment
                topLevelComments.push(comment);
                console.log("[FB Extractor] Added top-level comment:", comment.id);
            }
        });

        console.log("[FB Extractor] Final structure - Top level:", topLevelComments.length, "Total comments:", flatComments.length);
        return topLevelComments;
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
        if (!postData || processed) return;

        processed = true;

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
            processed = false;
            seenResponses.clear();
            console.log("[FB Extractor] Page changed, resetting");
        }
    });
    pageObserver.observe(document, { childList: true, subtree: true });

})();
