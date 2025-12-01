/**
 * Quiz Runner
 * Handles quiz logic, question display, and results
 */

class QuizRunner {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.answers = [];
        this.topicName = '';

        this.elements = {
            title: document.getElementById('quiz-title'),
            progress: document.getElementById('progress'),
            progressText: document.getElementById('progress-text'),
            questionCard: document.getElementById('question-card'),
            quizContainer: document.getElementById('quiz-container'),
            resultsContainer: document.getElementById('results-container'),
            scoreValue: document.getElementById('score-value'),
            scoreTotal: document.getElementById('score-total'),
            scorePercentage: document.getElementById('score-percentage'),
            scoreMessage: document.getElementById('score-message'),
            mistakesSection: document.getElementById('mistakes-section'),
            mistakesList: document.getElementById('mistakes-list'),
            retryBtn: document.getElementById('retry-btn'),
        };

        this.elements.retryBtn.addEventListener('click', () => this.restart());
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        const topicFile = params.get('topic');

        if (!topicFile) {
            this.showError('Nebylo vybráno žádné téma');
            return;
        }

        try {
            const response = await fetch(`./quizzes/${topicFile}`);
            if (!response.ok) {
                throw new Error('Failed to load quiz');
            }

            const data = await response.json();
            this.topicName = data.topic || 'Kvíz';
            this.questions = this.shuffleArray([...data.questions]);
            this.answers = new Array(this.questions.length).fill(null);

            this.elements.title.textContent = this.topicName;
            document.title = `${this.topicName} - Kvíz`;

            this.renderQuestion();
            this.updateProgress();
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showError('Nepodařilo se načíst kvíz. Zkus to prosím znovu.');
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    updateProgress() {
        const progress = ((this.currentIndex) / this.questions.length) * 100;
        this.elements.progress.style.width = `${progress}%`;
        this.elements.progressText.textContent = `${this.currentIndex} / ${this.questions.length}`;
    }

    renderQuestion() {
        const question = this.questions[this.currentIndex];
        const savedAnswer = this.answers[this.currentIndex];

        let typeLabel = '';
        switch (question.type) {
            case 'multiple_choice':
                typeLabel = 'Výběr z možností';
                break;
            case 'true_false':
                typeLabel = 'Pravda nebo nepravda';
                break;
            case 'fill_blank':
                typeLabel = 'Doplň';
                break;
        }

        let answersHtml = '';
        switch (question.type) {
            case 'multiple_choice':
                answersHtml = this.renderMultipleChoice(question, savedAnswer);
                break;
            case 'true_false':
                answersHtml = this.renderTrueFalse(savedAnswer);
                break;
            case 'fill_blank':
                answersHtml = this.renderFillBlank(savedAnswer);
                break;
        }

        this.elements.questionCard.innerHTML = `
            <span class="question-type">${typeLabel}</span>
            <p class="question-text">${this.escapeHtml(question.question)}</p>
            ${answersHtml}
            <div class="submit-container">
                ${this.currentIndex > 0 ? '<button class="btn btn-secondary" id="prev-btn">Předchozí</button>' : ''}
                <button class="btn btn-primary" id="next-btn" ${savedAnswer === null ? 'disabled' : ''}>
                    ${this.currentIndex === this.questions.length - 1 ? 'Dokončit' : 'Další'}
                </button>
            </div>
        `;

        this.attachEventListeners(question.type);
    }

    renderMultipleChoice(question, savedAnswer) {
        const options = question.options.map((option, index) => {
            const selected = savedAnswer === index ? 'selected' : '';
            return `
                <button class="option-btn ${selected}" data-index="${index}">
                    ${this.escapeHtml(option)}
                </button>
            `;
        }).join('');

        return `<div class="options-list">${options}</div>`;
    }

    renderTrueFalse(savedAnswer) {
        const trueSelected = savedAnswer === true ? 'selected' : '';
        const falseSelected = savedAnswer === false ? 'selected' : '';

        return `
            <div class="tf-options">
                <button class="option-btn tf-btn ${trueSelected}" data-value="true">Pravda</button>
                <button class="option-btn tf-btn ${falseSelected}" data-value="false">Nepravda</button>
            </div>
        `;
    }

    renderFillBlank(savedAnswer) {
        const value = savedAnswer !== null ? this.escapeHtml(savedAnswer) : '';
        return `
            <input type="text" class="fill-blank-input" id="fill-blank-input"
                   placeholder="Napiš odpověď..." value="${value}" autocomplete="off">
        `;
    }

    attachEventListeners(questionType) {
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');

        nextBtn.addEventListener('click', () => this.nextQuestion());
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousQuestion());
        }

        switch (questionType) {
            case 'multiple_choice':
                document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(e.target.dataset.index);
                        this.selectAnswer(index);
                    });
                });
                break;

            case 'true_false':
                document.querySelectorAll('.tf-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const value = e.target.dataset.value === 'true';
                        this.selectAnswer(value);
                    });
                });
                break;

            case 'fill_blank':
                const input = document.getElementById('fill-blank-input');
                input.addEventListener('input', (e) => {
                    const value = e.target.value.trim();
                    this.selectAnswer(value || null);
                });
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && this.answers[this.currentIndex] !== null) {
                        this.nextQuestion();
                    }
                });
                input.focus();
                break;
        }
    }

    selectAnswer(answer) {
        this.answers[this.currentIndex] = answer;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        const question = this.questions[this.currentIndex];
        if (question.type === 'multiple_choice') {
            const selected = document.querySelector(`.option-btn[data-index="${answer}"]`);
            if (selected) selected.classList.add('selected');
        } else if (question.type === 'true_false') {
            const selected = document.querySelector(`.tf-btn[data-value="${answer}"]`);
            if (selected) selected.classList.add('selected');
        }

        const nextBtn = document.getElementById('next-btn');
        nextBtn.disabled = answer === null;
    }

    nextQuestion() {
        if (this.answers[this.currentIndex] === null) return;

        if (this.currentIndex === this.questions.length - 1) {
            this.showResults();
        } else {
            this.currentIndex++;
            this.updateProgress();
            this.renderQuestion();
        }
    }

    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateProgress();
            this.renderQuestion();
        }
    }

    showResults() {
        this.elements.quizContainer.classList.add('hidden');
        this.elements.resultsContainer.classList.remove('hidden');

        const results = this.calculateResults();

        this.elements.scoreValue.textContent = results.correct;
        this.elements.scoreTotal.textContent = results.total;
        this.elements.scorePercentage.textContent = `${results.percentage}%`;

        const messageEl = this.elements.scoreMessage;
        if (results.percentage >= 90) {
            messageEl.textContent = 'Výborný';
            messageEl.className = 'score-message excellent';
        } else if (results.percentage >= 75) {
            messageEl.textContent = 'Chvalitebný';
            messageEl.className = 'score-message good';
        } else if (results.percentage >= 50) {
            messageEl.textContent = 'Dobrý';
            messageEl.className = 'score-message medium';
        } else {
            messageEl.textContent = 'Dostatečný';
            messageEl.className = 'score-message needs-work';
        }

        this.elements.progress.style.width = '100%';
        this.elements.progressText.textContent = `${this.questions.length} / ${this.questions.length}`;

        if (results.mistakes.length > 0) {
            this.elements.mistakesSection.classList.remove('hidden');
            this.renderMistakes(results.mistakes);
        } else {
            this.elements.mistakesSection.classList.add('hidden');
        }
    }

    calculateResults() {
        let correct = 0;
        const mistakes = [];

        this.questions.forEach((question, index) => {
            const userAnswer = this.answers[index];
            const isCorrect = this.checkAnswer(question, userAnswer);

            if (isCorrect) {
                correct++;
            } else {
                mistakes.push({
                    question: question.question,
                    type: question.type,
                    userAnswer: userAnswer,
                    correctAnswer: question.answer,
                    options: question.options,
                    explanation: question.explanation,
                });
            }
        });

        return {
            correct,
            total: this.questions.length,
            percentage: Math.round((correct / this.questions.length) * 100),
            mistakes,
        };
    }

    checkAnswer(question, userAnswer) {
        switch (question.type) {
            case 'multiple_choice':
                return userAnswer === question.answer;

            case 'true_false':
                return userAnswer === question.answer;

            case 'fill_blank':
                if (typeof userAnswer !== 'string') return false;
                return this.fuzzyMatch(userAnswer, question.answer);

            default:
                return false;
        }
    }

    // Remove diacritics from string (á->a, č->c, etc.)
    removeDiacritics(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Calculate Levenshtein distance between two strings
    levenshteinDistance(a, b) {
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

    // Fuzzy match for fill-in-the-blank answers
    fuzzyMatch(userAnswer, correctAnswer) {
        const userNorm = this.removeDiacritics(userAnswer.toLowerCase().trim());
        const correctNorm = this.removeDiacritics(correctAnswer.toLowerCase().trim());

        // Exact match (ignoring case and diacritics)
        if (userNorm === correctNorm) {
            return true;
        }

        // Fuzzy match: allow 1 error for short words, 2 for longer ones
        const maxDistance = correctNorm.length <= 5 ? 1 : 2;
        const distance = this.levenshteinDistance(userNorm, correctNorm);

        return distance <= maxDistance;
    }

    renderMistakes(mistakes) {
        this.elements.mistakesList.innerHTML = mistakes.map(mistake => {
            let userAnswerText = '';
            let correctAnswerText = '';

            switch (mistake.type) {
                case 'multiple_choice':
                    userAnswerText = mistake.options[mistake.userAnswer];
                    correctAnswerText = mistake.options[mistake.correctAnswer];
                    break;

                case 'true_false':
                    userAnswerText = mistake.userAnswer ? 'Pravda' : 'Nepravda';
                    correctAnswerText = mistake.correctAnswer ? 'Pravda' : 'Nepravda';
                    break;

                case 'fill_blank':
                    userAnswerText = mistake.userAnswer || '(prázdné)';
                    correctAnswerText = mistake.correctAnswer;
                    break;
            }

            return `
                <div class="mistake-card">
                    <p class="mistake-question">${this.escapeHtml(mistake.question)}</p>
                    <p class="mistake-detail your-answer">Tvoje odpověď: ${this.escapeHtml(userAnswerText)}</p>
                    <p class="mistake-detail correct-answer">Správná odpověď: ${this.escapeHtml(correctAnswerText)}</p>
                    ${mistake.explanation ? `<p class="mistake-explanation">${this.escapeHtml(mistake.explanation)}</p>` : ''}
                </div>
            `;
        }).join('');
    }

    restart() {
        this.currentIndex = 0;
        this.questions = this.shuffleArray([...this.questions]);
        this.answers = new Array(this.questions.length).fill(null);

        this.elements.quizContainer.classList.remove('hidden');
        this.elements.resultsContainer.classList.add('hidden');

        this.updateProgress();
        this.renderQuestion();
    }

    showError(message) {
        this.elements.questionCard.innerHTML = `
            <div class="empty-state">
                <p>${this.escapeHtml(message)}</p>
                <a href="index.html" class="btn btn-primary">Zpět na témata</a>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const quiz = new QuizRunner();
    quiz.init();
});
