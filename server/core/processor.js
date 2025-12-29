const { extractPostData } = require('./extract/post');
const { processComments } = require('./extract/comments');
const { deduplicateComments } = require('./extract/dedupe');
const { findCommentsArray } = require('./extract/finder');

function processRawData(allItems) {
    if (!Array.isArray(allItems)) allItems = [allItems];
    const processedIds = new Set();

    return allItems.map(item => {
        let story = (item.post && item.post.id) ? item.post : (item.id ? item : null);
        let rawComments = item.extracted_raw_comments || item.post?.extracted_raw_comments || findCommentsArray(item) || [];

        if (!story || processedIds.has(story.id)) return null;
        processedIds.add(story.id);

        const postData = extractPostData(story);
        const comments = deduplicateComments(processComments(rawComments));

        return { post: postData, comments };
    }).filter(p => p !== null);
}

module.exports = { processRawData };
