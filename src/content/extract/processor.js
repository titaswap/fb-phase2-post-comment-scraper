import { CONTENT_STATE } from '../state/store.js';
import { scheduleDataSend } from '../messaging/sender.js';
import { extractRawPostData, extractRawComments } from './raw.js';

export function processGraphQLResponse(data) {
    if (!data) return;
    const responseStr = JSON.stringify(data);
    if (CONTENT_STATE.seenResponses.has(responseStr)) return;
    CONTENT_STATE.seenResponses.add(responseStr);

    if (!CONTENT_STATE.extractedRawPost) {
        const result = extractRawPostData(data);
        if (result) {
            CONTENT_STATE.extractedRawPost = result;
            CONTENT_STATE.CURRENT_POST_ID = result.id;
            scheduleDataSend();
        }
    }

    const newComments = extractRawComments(data);
    if (newComments.length > 0) scheduleDataSend();
}
