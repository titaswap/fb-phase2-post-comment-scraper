const fs = require('fs');
const path = require('path');
const { BACKUP_DIR, RAW_BACKUP_FILE } = require('../config/constants');
const { ensureDir, writeJson, readJsonBoxed } = require('../utils/io');

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function rotateBackup() {
    if (!fs.existsSync(RAW_BACKUP_FILE)) return;
    if (fs.statSync(RAW_BACKUP_FILE).size <= MAX_SIZE) return;

    const files = fs.readdirSync(BACKUP_DIR);
    let max = 0;
    files.forEach(f => {
        const m = f.match(/^raw_posts_backup_(\d+)\.json$/);
        if (m) max = Math.max(max, parseInt(m[1]));
    });

    fs.renameSync(RAW_BACKUP_FILE, path.join(BACKUP_DIR, `raw_posts_backup_${max + 1}.json`));
    writeJson(RAW_BACKUP_FILE, []);
}

function appendRawBackup(newItems) {
    ensureDir(BACKUP_DIR);
    rotateBackup();

    const current = readJsonBoxed(RAW_BACKUP_FILE);
    const ids = new Set(current.map(i => i?.post?.id || i?.id).filter(Boolean));
    const unique = newItems.filter(i => !ids.has(i?.post?.id || i?.id));

    if (unique.length > 0) writeJson(RAW_BACKUP_FILE, [...current, ...unique]);
    return unique.length;
}

module.exports = { appendRawBackup };
