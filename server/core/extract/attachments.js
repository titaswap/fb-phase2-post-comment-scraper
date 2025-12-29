const { getNestedValue } = require('../../utils/object');

const BLOCKED_PATHS = ["large_share_image", "flexible_height_share_image"];
const BLOCKED_DOMAINS = ["fbcdn.net", "external."];

function getSafeAttachmentUrl(att) {
    let foundUrl = null;

    function deepScan(obj, path = "") {
        if (!obj || typeof obj !== "object" || foundUrl) return;
        for (const key in obj) {
            const val = obj[key];
            const currentPath = path ? `${path}.${key}` : key;
            if (BLOCKED_PATHS.some(p => currentPath.includes(p))) continue;

            if (key === "url" && typeof val === "string" && val.startsWith("http")) {
                if (BLOCKED_DOMAINS.some(d => val.includes(d)) &&
                    !val.includes("facebook.com/photo")) continue;
                foundUrl = val;
                return;
            }
            if (typeof val === "object") deepScan(val, currentPath);
        }
    }
    deepScan(att);
    return foundUrl;
}

function processAttachments(attachmentsArr) {
    return attachmentsArr.map(att => {
        const webLink = getNestedValue(att, "styles.attachment.story_attachment_link_renderer.attachment.web_link.url");
        if (webLink) return { "ExternalWebLink": webLink };

        const smartUrl = getSafeAttachmentUrl(getNestedValue(att, "styles.attachment"));
        if (smartUrl) return { source_type: getNestedValue(att, "styles.attachment.source.text") || "unknown", url: smartUrl };

        return {
            source_type: getNestedValue(att, "styles.attachment.source.text") || getNestedValue(att, "media.__typename"),
            url: getNestedValue(att, "styles.attachment.url") || null
        };
    });
}

module.exports = { processAttachments };
