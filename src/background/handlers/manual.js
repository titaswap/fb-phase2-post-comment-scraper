import { STATE } from '../state/store.js';
import { nextPost } from '../flow/next.js';
import { navigateTo } from '../flow/navigate.js';
import { saveState } from '../state/persistence.js';

export function handleManual(msg, sendResponse) {
    if (msg.type === "NEXT_POST") {
        if (!STATE.posts.length) return sendResponse({ error: "No posts" });
        if (STATE.index < STATE.posts.length) {
            const post = STATE.posts[STATE.index++];
            navigateTo(post.post_link, () => { });
        }
        return sendResponse({ success: true });
    }
    if (msg.type === "PREVIOUS_POST") {
        if (STATE.index <= 0) return sendResponse({ error: "At start" });
        STATE.index--;
        navigateTo(STATE.posts[STATE.index].post_link, () => { });
        return sendResponse({ success: true });
    }
    return false;
}
