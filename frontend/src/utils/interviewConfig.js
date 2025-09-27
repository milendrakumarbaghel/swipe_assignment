export const difficultyOrder = ['EASY', 'EASY', 'MEDIUM', 'MEDIUM', 'HARD', 'HARD'];

export const timeLimits = {
    EASY: 20,
    MEDIUM: 60,
    HARD: 120,
};

export function difficultyLabel(difficulty) {
    switch (difficulty) {
        case 'EASY':
            return 'Easy';
        case 'MEDIUM':
            return 'Medium';
        case 'HARD':
            return 'Hard';
        default:
            return difficulty;
    }
}
