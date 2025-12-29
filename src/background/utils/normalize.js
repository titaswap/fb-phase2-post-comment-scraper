export function normalizeCommentDates(comments) {
    comments.forEach(c => {
        if (!c.date && c.timestamp) {
            c.timestamp_readable = new Date(c.timestamp * 1000).toLocaleString();
        }
        if (c.replies?.length) normalizeCommentDates(c.replies);
    });
}

export function normalizePostDate(post) {
    if (!post.date && post.timestamp) {
        const ms = post.timestamp * 1000;
        const now = Date.now();
        const final = (ms > now + 31536000000) ? ms : ms;
        post.timestamp_readable = new Date(final).toLocaleString();
    }
}
