const { processRawData } = require('../core/processor');
const { appendRawBackup } = require('../logic/backup');
const { mergeData } = require('../logic/merge');
const { FINAL_FILE } = require('../config/constants');
const { readJsonBoxed, writeJson } = require('../utils/io');

function appendData(req, res) {
    try {
        const raw = Array.isArray(req.body) ? req.body : [req.body];
        appendRawBackup(raw);

        const processed = processRawData(raw);
        const current = readJsonBoxed(FINAL_FILE);
        const { updatedCount, appendedCount } = mergeData(current, processed);

        writeJson(FINAL_FILE, current);

        res.json({ success: true, appended: appendedCount, updated: updatedCount, total: current.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

module.exports = { appendData };
