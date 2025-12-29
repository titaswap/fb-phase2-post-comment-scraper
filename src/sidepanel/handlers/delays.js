import { EL } from '../ui/dom.js';

export function setupDelayHandlers() {
    EL.inputs.minDelay.onchange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (val > 0) chrome.runtime.sendMessage({ type: "UPDATE_DELAY_SETTINGS", payload: { min: val } });
    };
    EL.inputs.maxDelay.onchange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (val > 0) chrome.runtime.sendMessage({ type: "UPDATE_DELAY_SETTINGS", payload: { max: val } });
    };
}
