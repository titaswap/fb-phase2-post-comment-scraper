const fs = require('fs');

// Configuration
const INPUT_FILE = './data/final.json';
const OUTPUT_FILE = './data/formatted_posts_final.json';

// --- Safe Access Helper ---
function getSafe(fn, defaultVal) {
    try {
        return res === undefined ? defaultVal : res;
    } catch (e) {
        return defaultVal;
    }
}

// --- Basic Cleaning & Formatting ---
function cleanText(text) {
    if (!text) return "";
    return text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getFormattedDate(timestamp) {
    if (!timestamp) return null;
    let ts = parseInt(timestamp);
    if (isNaN(ts)) return null;
    if (ts < 10000000000) ts = ts * 1000;
    try {
        return new Date(ts).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) { return null; }
}

function getNestedValue(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) return defaultValue;
        const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
        } else {
            current = current[key];
        }
    }
    return current === undefined ? defaultValue : current;
}

// --- Comment Processing Logic (Integrated from structureComments.js) ---

/**
 * Recursively processing comments and their replies.
 * @param {Array} commentsArray - Array of comment nodes from Facebook's Graph structures.
 * @returns {Array} - Cleaned up array of comment objects with nested replies.
 */
function processComments(commentsArray) {
    if (!commentsArray || !Array.isArray(commentsArray)) {
        return [];
    }

    return commentsArray.map(node => {
        const createdTime = node.created_time || (node.comment_action_links && node.comment_action_links[0] && node.comment_action_links[0].comment && node.comment_action_links[0].comment.created_time) || 0;

        const commentData = {
            id: node.id,
            author: node.author ? node.author.name : 'Unknown',
            author_id: node.author ? node.author.id : null,
            author_url: node.author ? node.author.url : null,
            text: cleanText(node.body ? node.body.text : (node.message && node.message.text ? node.message.text : '')),
            comment_url: node.url || node.wwwURL || getSafe(() => node.comment_action_links[0].comment.url, null) || "",
            "Date and time": getFormattedDate(createdTime),
            replies: []
        };

        // Check for replies in likely locations
        // 1. node.feedback.replies.nodes (Standard Graph)
        // 2. node.replies.nodes (Simplified)
        // 3. node.feedback.replies_connection.edges[].node (New schema seen in commentObject.json)

        let foundReplies = [];

        if (node.feedback && node.feedback.replies && node.feedback.replies.nodes) {
            foundReplies = node.feedback.replies.nodes;
        } else if (node.replies && node.replies.nodes) {
            foundReplies = node.replies.nodes;
        } else if (node.feedback && node.feedback.replies_connection && node.feedback.replies_connection.edges) {
            // Map edges to nodes
            foundReplies = node.feedback.replies_connection.edges.map(edge => edge.node);
        }

        if (foundReplies && foundReplies.length > 0) {
            commentData.replies = processComments(foundReplies);
        }

        return commentData;
    });
}

/**
 * Deduplicate: Remove top-level items that appear as replies in other items
 */
function deduplicateComments(structuredComments) {
    const childIds = new Set();

    function collectChildIds(nodes) {
        nodes.forEach(node => {
            if (node.replies && node.replies.length > 0) {
                node.replies.forEach(reply => {
                    childIds.add(reply.id);
                    collectChildIds([reply]); // Recurse
                });
            }
        });
    }

    collectChildIds(structuredComments);

    const finalComments = structuredComments.filter(comment => !childIds.has(comment.id));

    return finalComments;
}

/**
 * Recursively searches for an array of potential comment nodes within a large object.
 */
function findCommentsArray(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Check if "this" object is the array we want
    if (Array.isArray(obj)) {
        // Heuristic: check first few elements to see if they look like comments
        if (obj.length > 0 && obj[0] && typeof obj[0] === 'object') {
            const sample = obj[0];
            const hasId = 'id' in sample;
            const hasBodyOrAuthor = ('body' in sample) || ('author' in sample) || ('message' in sample);
            const isPost = 'comet_sections' in sample;

            if (hasId && hasBodyOrAuthor && !isPost) {
                return obj;
            }
        }
        // If it's an array but doesn't look like comments, recursively search its items
        for (const item of obj) {
            const found = findCommentsArray(item);
            if (found) return found;
        }
        return null;
    }

    // If it's an object, search all keys
    const priorityKeys = ['nodes', 'comments', 'feedback', 'extracted_raw_comments'];

    // Check priority keys first
    for (const key of priorityKeys) {
        if (key in obj) {
            const found = findCommentsArray(obj[key]);
            if (found) return found;
        }
    }

    // Check all other keys
    for (const key in obj) {
        if (!priorityKeys.includes(key)) {
            const found = findCommentsArray(obj[key]);
            if (found) return found;
        }
    }

    return null;
}

// --- Main Processing Function (Exportable) ---
function processRawData(allItems) {
    if (!Array.isArray(allItems)) allItems = [allItems];
    const processedIds = new Set();

    return allItems.map(item => {
        let story = null;
        let rawComments = null;

        if (item.post && item.post.id) {
            story = item.post;
            // Try direct access first
            rawComments = item.extracted_raw_comments || item.post.extracted_raw_comments;
        } else if (item.id) {
            story = item;
            rawComments = item.extracted_raw_comments;
        }

        // Fallback: Use deep search if specific key is missing but comments might be elsewhere
        if (!rawComments) {
            rawComments = findCommentsArray(item);
        }

        if (!rawComments) rawComments = [];

        if (!story) return null;
        if (processedIds.has(story.id)) return null; // Skip duplicates within this batch
        processedIds.add(story.id);

        // --- Post Fields ---
        const commentCount = getNestedValue(story, "comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.comment_rendering_instance.comments.total_count")
            || story.comment_count || story.feedback?.comments?.total_count || 0;

        const reactionCount = getNestedValue(story, "comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.i18n_reaction_count")
            || story.feedback?.reaction_count?.count || 0;

        const shareCount = getNestedValue(story, "comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.i18n_share_count")
            || story.feedback?.share_count?.count || 0;

        let creationTime = getNestedValue(story, "comet_sections.timestamp.story.creation_time");
        if (!creationTime) creationTime = getNestedValue(story, "comet_sections.context_layout.story.comet_sections.metadata[0].story.creation_time");
        if (!creationTime) creationTime = story.created_time || story.publish_time || 0;

        const attachmentsArr = story.attachments
            || getNestedValue(story, "attachments") // Or any other location
            || [];

        const formattedAttachments = attachmentsArr.map(att => {
            const webLink = getNestedValue(att, "styles.attachment.story_attachment_link_renderer.attachment.web_link.url");
            if (webLink) {
                return { "ExternalWebLink": webLink };
            }
            const sourceText = getNestedValue(att, "styles.attachment.source.text");
            const attachmentUrl = getNestedValue(att, "styles.attachment.url");
            if (sourceText) {
                return {
                    "source_type": sourceText,
                    "url": attachmentUrl
                };
            }
            return {
                "source_type": getNestedValue(att, "media.__typename"),
                "Count": getNestedValue(att, "styles.attachment.all_subattachments.count"),
                "url": attachmentUrl
            };
        });

        let postText = cleanText(
            story.message?.text ||
            getNestedValue(story, "comet_sections.message.story.message.text") ||
            getNestedValue(story, "comet_sections.content.story.comet_sections.message.story.message.text") ||
            ""
        );

        if (!postText) {
            const richMessage = getNestedValue(story, "comet_sections.content.story.comet_sections.message.rich_message");
            if (Array.isArray(richMessage)) {
                postText = richMessage.map(part => part.text).join(' ');
            }
        }

        const postData = {
            url: story.url || story.wwwURL ||
                getNestedValue(story, "comet_sections.content.story.wwwURL") ||
                getNestedValue(story, "comet_sections.context_layout.story.comet_sections.metadata[0].override_url") ||
                getNestedValue(story, "comet_sections.context_layout.story.comet_sections.metadata[0].story.url") ||
                getNestedValue(story, "comet_sections.content.story.comet_sections.message.story.url") || "",
            id: story.id,
            author: story.actors?.[0]?.name || "Unknown",
            author_url: story.actors?.[0]?.url || "",
            text: postText,
            comment_count: commentCount,
            reaction_count: reactionCount,
            share_count: shareCount,
            "Date and time": getFormattedDate(creationTime),
            attachments: formattedAttachments
        };

        const processedComments = processComments(rawComments);
        const finalComments = deduplicateComments(processedComments);

        return {
            post: postData,
            comments: finalComments
        };

    }).filter(p => p !== null);
}

function processAllPosts() {
    try {
        console.log(`Reading raw data from ${INPUT_FILE}...`);
        const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
        let allItems = JSON.parse(rawData);

        const formattedPosts = processRawData(allItems);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(formattedPosts, null, 2), 'utf8');
        console.log(`✅ Success! Data saved to ${OUTPUT_FILE}`);
        console.log(`Total posts: ${formattedPosts.length}`);

    } catch (err) {
        console.error("Error:", err);
    }
}

// Export for use in server
module.exports = { processRawData };

// Run if called directly
if (require.main === module) {
    processAllPosts();
}
