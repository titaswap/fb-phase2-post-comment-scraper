function deduplicateComments(structuredComments) {
    const childIds = new Set();

    function collectChildIds(nodes) {
        nodes.forEach(node => {
            if (node.replies && node.replies.length > 0) {
                node.replies.forEach(reply => {
                    childIds.add(reply.id);
                    collectChildIds([reply]);
                });
            }
        });
    }

    collectChildIds(structuredComments);
    return structuredComments.filter(c => !childIds.has(c.id));
}

module.exports = { deduplicateComments };
