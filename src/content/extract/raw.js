import { CONTENT_STATE } from '../state/store.js';
import { scheduleDataSend } from '../messaging/sender.js';
import { walkObject } from './walker.js';

export function extractRawPostData(data) {
    let foundStory = null;
    walkObject(data, (obj) => {
        if (foundStory) return;
        const story = obj.story || obj;
        if ((obj.__typename === 'Story' || obj.story) && story.id) {
            // Logic regarding ID matching matches currentUrl logic would go here
            // For now, simplified greedy match as per original logic "first substantial story" works well
            if (story.message || story.actors || story.comet_sections) {
                foundStory = story;
            }
        }
    });
    return foundStory;
}

export function extractRawComments(data) {
    const commentsFound = [];
    walkObject(data, (obj) => {
        if (obj.__typename === "Comment" && obj.id) {
            if (!CONTENT_STATE.extractedRawComments.some(c => c.id === obj.id)) {
                CONTENT_STATE.extractedRawComments.push(obj);
                commentsFound.push(obj);
            }
        }
    });
    return commentsFound; // Return newly found ones
}
