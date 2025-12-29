const { DATA_DIR, FINAL_FILE, RAW_BACKUP_FILE } = require('../config/constants');
const { ensureDir, writeJson } = require('../utils/io');
const fs = require('fs');

function initServerFiles() {
    ensureDir(DATA_DIR);
    if (!fs.existsSync(FINAL_FILE)) {
        writeJson(FINAL_FILE, []);
        console.log('✅ Created formatted_posts_final.json');
    }
    if (!fs.existsSync(RAW_BACKUP_FILE)) {
        writeJson(RAW_BACKUP_FILE, []);
    }
}

module.exports = { initServerFiles };
