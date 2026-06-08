/**
 * Answer-matching helpers for fill-in-the-blank questions.
 *
 * Loaded as a plain <script> in the browser (attaches window.QuizMatching)
 * and as a CommonJS module under Node for testing.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.QuizMatching = api;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    // Lowercase, trim, collapse internal whitespace, and strip diacritics
    // (á->a, č->c, ...) so matching is forgiving about accents and spacing.
    function normalize(str) {
        return str
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    function levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // How many typos to tolerate, scaled to answer length. Very short
    // answers must match exactly (a single edit changes their meaning);
    // longer answers allow roughly one error per five characters.
    function allowedDistance(length) {
        if (length <= 3) return 0;
        if (length <= 7) return 1;
        return Math.floor(length * 0.2);
    }

    function fuzzyMatch(userAnswer, correctAnswer) {
        const user = normalize(userAnswer);
        const correct = normalize(correctAnswer);

        if (!user) return false;
        if (user === correct) return true;

        return levenshteinDistance(user, correct) <= allowedDistance(correct.length);
    }

    return { normalize, levenshteinDistance, allowedDistance, fuzzyMatch };
});
