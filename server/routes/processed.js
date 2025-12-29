const { FINAL_FILE } = require('../config/constants');
const { readJsonBoxed } = require('../utils/io');

function getProcessedUrls(req, res) {
    try {
        const posts = readJsonBoxed(FINAL_FILE);
        const urls = posts.map(p => p.post?.url).filter(Boolean);
        res.json({ success: true, urls });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

module.exports = { getProcessedUrls };
