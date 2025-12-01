/**
 * Quiz Index Page
 * Loads and displays available quizzes
 */

const QUIZZES_MANIFEST = './quizzes/manifest.json?v=' + Date.now();
let selectedIndex = 0;
let quizCards = [];
let helpVisible = false;

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

        quizCards = Array.from(quizList.querySelectorAll('.quiz-card'));
        if (quizCards.length > 0) {
            updateSelection(0);
            setupKeyboardNavigation();
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

function updateSelection(newIndex) {
    quizCards.forEach((card, i) => {
        card.classList.toggle('selected', i === newIndex);
    });
    selectedIndex = newIndex;
    quizCards[selectedIndex].scrollIntoView({ block: 'nearest' });
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // ? shows help
        if (e.key === '?') {
            toggleHelp();
            return;
        }

        // Escape closes help
        if (e.key === 'Escape' && helpVisible) {
            hideHelp();
            return;
        }

        // Ignore other keys if help is showing
        if (helpVisible) return;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    updateSelection(selectedIndex - 1);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < quizCards.length - 1) {
                    updateSelection(selectedIndex + 1);
                }
                break;
            case 'Enter':
                e.preventDefault();
                quizCards[selectedIndex].click();
                break;
        }
    });
}

function toggleHelp() {
    if (helpVisible) {
        hideHelp();
    } else {
        showHelp();
    }
}

function showHelp() {
    if (document.getElementById('help-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.className = 'help-overlay';
    overlay.innerHTML = `
        <div class="help-popup">
            <h3>Klávesové zkratky</h3>
            <dl class="shortcuts-list">
                <div><dt>↑ ↓</dt><dd>Výběr kvízu</dd></div>
                <div><dt>Enter</dt><dd>Spustit kvíz</dd></div>
                <div><dt>?</dt><dd>Zobrazit/skrýt nápovědu</dd></div>
            </dl>
            <button class="btn btn-secondary" id="close-help">Zavřít</button>
        </div>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.id === 'close-help') {
            hideHelp();
        }
    });
    document.body.appendChild(overlay);
    helpVisible = true;
}

function hideHelp() {
    const overlay = document.getElementById('help-overlay');
    if (overlay) {
        overlay.remove();
    }
    helpVisible = false;
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
