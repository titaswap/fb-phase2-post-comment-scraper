const fs = require('fs');

function readJsonBoxed(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = { readJsonBoxed, writeJson, ensureDir };
