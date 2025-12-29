const { cleanText } = require('../../utils/text');
const { getFormattedDate } = require('../../utils/date');

function processComments(commentsArray) {
    if (!commentsArray || !Array.isArray(commentsArray)) return [];

    return commentsArray.map(node => {
        const created = node.created_time || node.comment_action_links?.[0]?.comment?.created_time || 0;

        let foundReplies = node.feedback?.replies?.nodes
            || node.replies?.nodes
            || node.feedback?.replies_connection?.edges?.map(e => e.node)
            || [];

        return {
            id: node.id,
            author: node.author ? node.author.name : 'Unknown',
            author_id: node.author?.id || null,
            author_url: node.author?.url || null,
            text: cleanText(node.body?.text || node.message?.text),
            comment_url: node.url || node.wwwURL || "",
            "Date and time": getFormattedDate(created),
            replies: processComments(foundReplies)
        };
    });
}

module.exports = { processComments };
