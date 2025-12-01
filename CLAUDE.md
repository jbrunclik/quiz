# Quiz App - Development Guide

## Project Overview

A quiz application for testing kids on various topics, consisting of:
1. **Question Generator** (Python) - Uses Gemini 3 Pro to generate questions from textbook/notebook photos
2. **Quiz App** (JavaScript) - Browser-based quiz runner hosted on GitHub Pages

## Project Structure

```
quiz/
├── generator/           # Python question generator
│   └── generate.py      # Main script to generate questions from images
├── quizzes/             # Generated quiz JSON files (committed)
├── topics/              # Input images directory (NOT committed - copyright)
│   └── <topic-name>/    # Create a folder per topic with images
├── web/                 # Quiz web application
│   ├── index.html       # Quiz selector
│   ├── quiz.html        # Quiz runner
│   ├── css/
│   └── js/
├── venv/                # Python virtual environment (NOT committed)
├── .env                 # API keys (NOT committed)
├── .env.example         # Template for .env
├── Makefile             # Task runner
└── requirements.txt     # Python dependencies
```

## Commands

```bash
make setup               # Create venv and install dependencies
make generate TOPIC=x    # Generate questions for topic 'x' from topics/x/
make serve               # Start local dev server for testing
make clean               # Clean generated files
```

## Question Format

Questions are stored in `quizzes/<topic>.json`:

```json
{
  "topic": "Topic Name",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    },
    {
      "type": "true_false",
      "question": "Statement...",
      "answer": true
    },
    {
      "type": "fill_blank",
      "question": "The ___ is...",
      "answer": "answer"
    }
  ]
}
```

## Environment Variables

- `GEMINI_API_KEY` - Google Gemini API key

## Key Design Decisions

- Questions randomized on each quiz run
- Wrong answers shown only at the end with explanations
- No time limits
- Flat structure (no topic hierarchy)
- All quiz data committed to repo for GitHub Pages hosting
- Topic images NOT committed (copyright)

## Gemini API

- Model: `gemini-3-pro-preview`
- Used for multimodal analysis of textbook/notebook images
- Generates comprehensive questions covering all material in images

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- HEIC/HEIF (.heic, .heif) - iPhone photos, auto-converted to JPEG

## Git Conventions

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependency updates

Examples:
```
feat: add support for HEIC images
fix: correct answer validation for fill-in-the-blank
docs: update README with deployment instructions
chore: update Gemini API dependency
```

## Deployment

The app is deployed to GitHub Pages automatically via GitHub Actions when pushing to `main`.
The workflow copies `web/` and `quizzes/` to create the static site.
