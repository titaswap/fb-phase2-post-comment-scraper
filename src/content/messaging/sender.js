import { CONTENT_STATE } from '../state/store.js';

export function scheduleDataSend() {
    if (CONTENT_STATE.dataSendTimeout) clearTimeout(CONTENT_STATE.dataSendTimeout);

    CONTENT_STATE.dataSendTimeout = setTimeout(() => {
        if (CONTENT_STATE.extractedRawPost || CONTENT_STATE.extractedRawComments.length > 0) {
            sendDataToBackground();
        }
    }, 2000);
}

function sendDataToBackground() {
    clearTimeout(CONTENT_STATE.dataSendTimeout);
    CONTENT_STATE.dataSendTimeout = null;

    let payload = {};
    if (CONTENT_STATE.extractedRawPost) {
        payload = CONTENT_STATE.extractedRawPost;
        payload.extracted_raw_comments = CONTENT_STATE.extractedRawComments;
    } else if (CONTENT_STATE.extractedRawComments.length > 0) {
        payload = {
            id: CONTENT_STATE.CURRENT_POST_ID || "unknown",
            missing_post_object: true,
            extracted_raw_comments: CONTENT_STATE.extractedRawComments
        };
    } else { return; }

    chrome.runtime.sendMessage({ type: "POST_DATA", payload });
}
