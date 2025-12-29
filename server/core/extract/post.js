const { getNestedValue } = require('../../utils/object');
const { cleanText } = require('../../utils/text');
const { getFormattedDate } = require('../../utils/date');
const { processAttachments } = require('./attachments');

function extractPostData(story) {
    let postText = cleanText(
        story.message?.text ||
        getNestedValue(story, "comet_sections.message.story.message.text") ||
        getNestedValue(story, "comet_sections.content.story.comet_sections.message.story.message.text")
    );

    if (!postText) {
        const rich = getNestedValue(story, "comet_sections.content.story.comet_sections.message.rich_message");
        if (Array.isArray(rich)) postText = rich.map(p => p.text).join(' ');
    }

    const attachments = story.attachments || getNestedValue(story, "attachments") || [];
    const creationTime = story.created_time || getNestedValue(story, "comet_sections.timestamp.story.creation_time") || 0;

    return {
        url: story.url || story.wwwURL || "",
        id: story.id,
        author: story.actors?.[0]?.name || "Unknown",
        author_url: story.actors?.[0]?.url || "",
        text: postText,
        "Date and time": getFormattedDate(creationTime),
        attachments: processAttachments(attachments)
    };
}

module.exports = { extractPostData };
