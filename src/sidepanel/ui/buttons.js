import { EL } from './dom.js';

export function updateButtons(status) {
    const isRunning = status.running;
    const isPaused = status.paused;
    EL.buttons.start.disabled = isRunning;
    EL.buttons.pause.disabled = !isRunning || isPaused;
    EL.buttons.resume.disabled = !isRunning || !isPaused;
    EL.buttons.stop.disabled = !isRunning;

    const ids = ["previous", "next", "reset", "set-index-btn", "start-index-input", "file", "final-file", "min-delay", "max-delay"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = isRunning;
    });
}
