import { EL } from './dom.js';

export const updateUI = (status) => {
    if (!status) return;
    EL.status.textContent = status.running ? (status.paused ? "Paused" : "Running") : "Idle";
    EL.status.className = status.running ? (status.paused ? "paused" : "running") : "status";
    EL.errors.textContent = `Errors: ${status.errors || 0}`;
    EL.finalCount.textContent = `Collected: ${status.finalCount !== undefined ? status.finalCount : "0"}`;

    if (EL.inputs.minDelay && status.minDelay) EL.inputs.minDelay.value = status.minDelay;
    if (EL.inputs.maxDelay && status.maxDelay) EL.inputs.maxDelay.value = status.maxDelay;
};
