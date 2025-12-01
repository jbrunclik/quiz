/**
 * Quiz Index Page
 * Loads and displays available quizzes
 */

const QUIZZES_MANIFEST = './quizzes/manifest.json?v=' + Date.now();

async function loadQuizzes() {
    const quizList = document.getElementById('quiz-list');

    try {
        const response = await fetch(QUIZZES_MANIFEST);
        if (!response.ok) {
            throw new Error('Failed to load quiz manifest');
        }

        const manifest = await response.json();
        const quizzes = manifest.quizzes || [];

        if (quizzes.length === 0) {
            quizList.innerHTML = `
                <div class="empty-state">
                    <p>Zatím nejsou k dispozici žádné kvízy.</p>
                    <p>Vytvoř kvíz pomocí: <code>make generate TOPIC=nazev-tematu</code></p>
                </div>
            `;
            return;
        }

        quizList.innerHTML = '';
        for (const quiz of quizzes) {
            const card = createQuizCard(quiz);
            quizList.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
        quizList.innerHTML = `
            <div class="empty-state">
                <p>Zatím nejsou k dispozici žádné kvízy.</p>
                <p>Vytvoř kvíz pomocí: <code>make generate TOPIC=nazev-tematu</code></p>
            </div>
        `;
    }
}

function createQuizCard(quiz) {
    const card = document.createElement('a');
    card.href = `quiz.html?topic=${encodeURIComponent(quiz.file)}`;
    card.className = 'quiz-card';

    const questionCount = quiz.questionCount || 0;
    const questionText = questionCount === 1 ? '1 otázka' : getQuestionText(questionCount);
    const dateText = quiz.dateAdded ? formatDate(quiz.dateAdded) : '';

    card.innerHTML = `
        <h2>${escapeHtml(quiz.topic)}</h2>
        <p class="meta">${questionText}${dateText ? ` · ${dateText}` : ''}</p>
    `;

    return card;
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

function getQuestionText(count) {
    if (count === 1) return '1 otázka';
    if (count >= 2 && count <= 4) return `${count} otázky`;
    return `${count} otázek`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadQuizzes);
