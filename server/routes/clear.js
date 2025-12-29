const { FINAL_FILE } = require('../config/constants');
const { writeJson } = require('../utils/io');

function clearData(req, res) {
    try {
        writeJson(FINAL_FILE, []);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { clearData };
