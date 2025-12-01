# Quiz App

A simple quiz application for testing kids on various topics. Generate questions from textbook and notebook photos using AI, then run interactive quizzes in the browser.

## Features

- **AI-Powered Question Generation**: Upload photos of textbooks or notebooks, and Gemini 3 Pro generates comprehensive quiz questions
- **Multiple Question Types**: Multiple choice, true/false, and fill-in-the-blank
- **Browser-Based Quiz**: Clean, responsive web interface - no installation needed for test-takers
- **GitHub Pages Hosting**: Quizzes are automatically deployed and accessible via URL
- **Comprehensive Coverage**: AI analyzes all content to ensure complete topic coverage

## Quick Start

### 1. Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/quiz.git
cd quiz

# Create Python virtual environment and install dependencies
make setup

# Configure your API key
cp .env.example .env
# Edit .env and add your Gemini API key
```

Get your Gemini API key at: https://aistudio.google.com/apikey

### 2. Generate a Quiz

```bash
# Create a folder for your topic
mkdir -p topics/math-fractions

# Add photos of textbook pages and/or notebook notes to the folder
# Supported formats: JPG, PNG, GIF, WebP, HEIC (iPhone photos)

# Generate questions
make generate TOPIC=math-fractions
```

The generated quiz will be saved to `quizzes/math-fractions.json`.

### 3. Test Locally

```bash
make serve
# Open http://localhost:8000/web/ in your browser
```

### 4. Deploy

Push to GitHub and the quiz will be automatically deployed to GitHub Pages:

```bash
git add quizzes/
git commit -m "feat: add math-fractions quiz"
git push
```

Your quiz will be available at: `https://YOUR_USERNAME.github.io/quiz/`

## Project Structure

```
quiz/
├── generator/           # Python question generator
│   └── generate.py
├── quizzes/             # Generated quiz JSON files (committed)
├── topics/              # Input images (NOT committed - copyright)
├── web/                 # Quiz web application
│   ├── index.html       # Quiz selector
│   ├── quiz.html        # Quiz runner
│   ├── css/
│   └── js/
├── .github/workflows/   # GitHub Actions for deployment
├── Makefile             # Task runner
└── requirements.txt     # Python dependencies
```

## Commands

| Command | Description |
|---------|-------------|
| `make setup` | Create venv and install dependencies |
| `make generate TOPIC=x` | Generate questions for topic from `topics/x/` |
| `make serve` | Start local development server |
| `make update-manifest` | Manually update quiz manifest |
| `make clean` | Remove venv and cache files |

## Question Types

The AI generates three types of questions based on the content:

1. **Multiple Choice**: Best for concepts requiring distinction between options
2. **True/False**: Best for verifiable factual statements
3. **Fill in the Blank**: Best for key terms and definitions

## GitHub Pages Setup

To enable automatic deployment to GitHub Pages:

1. Push this repository to GitHub
2. Go to your repository on GitHub
3. Navigate to **Settings** > **Pages** (in the left sidebar under "Code and automation")
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
5. The deployment will trigger automatically on the next push to `main`

After the first deployment completes:
- Your quiz will be available at: `https://YOUR_USERNAME.github.io/quiz/`
- Check the **Actions** tab to monitor deployment status
- Each push to `main` will automatically redeploy

### Troubleshooting

- If deployment fails, check the Actions tab for error logs
- Ensure the repository is public, or you have GitHub Pro for private Pages
- The first deployment may take a few minutes to propagate

## License

MIT
