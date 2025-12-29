function findCommentsArray(obj) {
    if (!obj || typeof obj !== 'object') return null;

    if (Array.isArray(obj)) {
        if (obj[0] && obj[0].id && (obj[0].body || obj[0].author || obj[0].message) && !obj[0].comet_sections) {
            return obj;
        }
        for (const item of obj) {
            const found = findCommentsArray(item);
            if (found) return found;
        }
        return null;
    }

    const priority = ['nodes', 'comments', 'feedback', 'extracted_raw_comments'];
    for (const key of priority) {
        if (obj[key]) {
            const found = findCommentsArray(obj[key]);
            if (found) return found;
        }
    }

    for (const key in obj) {
        if (!priority.includes(key)) {
            const found = findCommentsArray(obj[key]);
            if (found) return found;
        }
    }
    return null;
}

module.exports = { findCommentsArray };
