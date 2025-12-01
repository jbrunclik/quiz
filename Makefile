.PHONY: setup generate serve clean update-manifest help

PYTHON := ./venv/bin/python
PIP := ./venv/bin/pip

help:
	@echo "Quiz App - Available Commands"
	@echo ""
	@echo "  make setup              Create Python venv and install dependencies"
	@echo "  make generate TOPIC=x   Generate questions for topic 'x' from topics/x/"
	@echo "  make serve              Start local development server"
	@echo "  make update-manifest    Update quiz manifest (auto-run after generate)"
	@echo "  make clean              Remove generated files and venv"
	@echo ""
	@echo "Example:"
	@echo "  mkdir -p topics/math-fractions"
	@echo "  # Add textbook images to topics/math-fractions/"
	@echo "  make generate TOPIC=math-fractions"

setup:
	@echo "Creating Python virtual environment..."
	python3 -m venv venv
	@echo "Installing dependencies..."
	$(PIP) install -r requirements.txt
	@echo ""
	@echo "Setup complete! Don't forget to create .env with your GEMINI_API_KEY"
	@echo "  cp .env.example .env"
	@echo "  # Edit .env and add your API key"

generate:
ifndef TOPIC
	$(error TOPIC is required. Usage: make generate TOPIC=your-topic-name)
endif
	@echo "Generating quiz for topic: $(TOPIC)"
	$(PYTHON) generator/generate.py $(TOPIC)
	@$(MAKE) update-manifest

update-manifest:
	@echo "Updating quiz manifest..."
	@$(PYTHON) generator/update_manifest.py

serve:
	@echo "Starting local development server..."
	@mkdir -p .serve
	@rm -rf .serve/*
	@cp -r web/* .serve/
	@cp -r quizzes .serve/
	@echo "Open http://localhost:8000 in your browser"
	@echo "Press Ctrl+C to stop"
	@python3 -m http.server 8000 --directory .serve

clean:
	rm -rf venv
	rm -rf __pycache__
	rm -rf generator/__pycache__
	@echo "Cleaned up generated files"
