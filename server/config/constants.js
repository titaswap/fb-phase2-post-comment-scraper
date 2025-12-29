const path = require('path');

const PORT = 8080;
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const FINAL_FILE = path.join(DATA_DIR, 'formatted_posts_final.json');
const RAW_BACKUP_FILE = path.join(BACKUP_DIR, 'raw_posts_backup.json');

module.exports = {
    PORT,
    DATA_DIR,
    BACKUP_DIR,
    FINAL_FILE,
    RAW_BACKUP_FILE
};
