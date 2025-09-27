import dayjs from 'dayjs';

export function secondsRemaining(timer) {
    if (!timer?.expiresAt) return 0;
    const diff = dayjs(timer.expiresAt).diff(dayjs(), 'second');
    return diff > 0 ? diff : 0;
}

export function formatSeconds(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    if (minutes <= 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}
