/**
 * Clean text by removing extra whitespace
 * @param {string} text 
 * @returns {string}
 */
function cleanText(text) {
    if (!text) return "";
    return text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { cleanText };
