import { EL } from './dom.js';

export function renderProgress(status) {
    let current = 0, total = 0;
    if (status.progress) {
        const parts = status.progress.split('/');
        if (parts.length === 2) {
            current = parseInt(parts[0]) || 0;
            total = parseInt(parts[1]) || 0;
        }
    }
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    EL.progressFill.style.width = `${percent}%`;
    EL.progressPercent.textContent = `${percent}%`;
    EL.progressFraction.textContent = `${current} / ${total}`;
}
