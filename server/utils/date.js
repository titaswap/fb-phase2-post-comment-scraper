/**
 * Format timestamp to readable string
 * @param {number|string} timestamp 
 * @returns {string|null}
 */
function getFormattedDate(timestamp) {
    if (!timestamp) return null;
    let ts = parseInt(timestamp);
    if (isNaN(ts)) return null;

    // Convert seconds to milliseconds
    if (ts < 10000000000) ts = ts * 1000;

    try {
        return new Date(ts).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) { return null; }
}

module.exports = { getFormattedDate };
