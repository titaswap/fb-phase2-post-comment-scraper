import { STATE } from '../state/store.js';
import { syncUIState } from '../state/sync.js';
import { GET_DATA_URL, PROCESSED_URL } from './config.js';
import { extractNumericId } from '../utils/ids.js';

export function fetchServerTotal() {
    fetch(GET_DATA_URL)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                STATE.serverTotal = data.length;
                data.forEach(p => {
                    const nid = extractNumericId(p.post?.url || "");
                    if (nid) STATE.processedIds.add(nid);
                });
                syncUIState();
            }
        })
        .catch(() => { });
}

export function fetchServerProcessedIds() {
    return fetch(PROCESSED_URL)
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.urls)) {
                data.urls.forEach(url => {
                    const id = extractNumericId(url);
                    if (id) STATE.processedIds.add(id);
                });
                return true;
            }
            return false;
        }).catch(() => false);
}
