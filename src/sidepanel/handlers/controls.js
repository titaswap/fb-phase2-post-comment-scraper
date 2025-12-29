import { EL } from '../ui/dom.js';
import { sendCmd } from '../logic/messaging.js';

export function setupControls() {
    EL.buttons.start.onclick = () => sendCmd("START_PHASE2");
    EL.buttons.pause.onclick = () => sendCmd("PAUSE_PHASE2");
    EL.buttons.resume.onclick = () => sendCmd("RESUME_PHASE2");
    EL.buttons.stop.onclick = () => sendCmd("STOP_PHASE2");
    EL.buttons.prev.onclick = () => sendCmd("PREVIOUS_POST");
    EL.buttons.next.onclick = () => sendCmd("NEXT_POST");
    EL.buttons.reset.onclick = () => sendCmd("RESET_INDEX");

    EL.buttons.setIndex.onclick = () => {
        const idx = parseInt(EL.inputs.startIndex.value, 10);
        if (!isNaN(idx) && idx >= 0) sendCmd("SET_INDEX", idx);
    };
}
