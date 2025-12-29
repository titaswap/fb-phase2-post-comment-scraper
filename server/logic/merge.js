function mergeData(existingData, newData) {
    let updatedCount = 0;
    let appendedCount = 0;

    newData.forEach(newItem => {
        const idx = existingData.findIndex(ex => ex.post?.id === newItem.post?.id);
        if (idx === -1) {
            existingData.push(newItem);
            appendedCount++;
        } else {
            const existing = existingData[idx];
            const map = new Map();
            existing.comments.forEach(c => map.set(c.id, c));

            let added = 0;
            newItem.comments.forEach(c => {
                if (!map.has(c.id)) { map.set(c.id, c); added++; }
            });

            if (added > 0) {
                existing.comments = Array.from(map.values());
                updatedCount++;
            }
        }
    });

    return { updatedCount, appendedCount };
}

module.exports = { mergeData };
