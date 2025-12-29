const { FINAL_FILE } = require('../config/constants');
const { readJsonBoxed } = require('../utils/io');

function getData(req, res) {
    try {
        res.json(readJsonBoxed(FINAL_FILE));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getData };
