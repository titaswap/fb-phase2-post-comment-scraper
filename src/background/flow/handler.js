import { STATE } from '../state/store.js';
import { saveState } from '../state/persistence.js';
import { sendDataToServer } from '../network/send.js';
import { getRandomDelay, startCountdown } from '../utils/time.js';
import { clearNavigationTimeout } from './timeout.js';
import { normalizePostDate, normalizeCommentDates } from '../utils/normalize.js';
import { nextPost } from './next.js';

export function handlePostData(data) {
    clearNavigationTimeout();
    // Inject URL from current state if missing
    let url = data.post_link || "";
    if (!url && STATE.index > 0 && STATE.posts[STATE.index - 1]) {
        url = STATE.posts[STATE.index - 1].post_link;
    }

    const finalData = data.post ? data : { post: data, url: url, captured_at: new Date().toISOString() };
    if (!finalData.url && url) finalData.url = url;
    if (finalData.post && !finalData.post.post_link && url) finalData.post.post_link = url;
    const postId = finalData.post?.id;

    if (!postId) return;
    if (STATE.processed.has(postId)) { /* Optional skip logic */ }

    normalizePostDate(finalData.post);
    if (finalData.post.comments) normalizeCommentDates(finalData.post.comments);

    STATE.processed.add(postId);
    saveState();
    sendDataToServer([finalData]);

    startCountdown(getRandomDelay(), nextPost);
}
