#!/usr/bin/env python3
"""
Quiz Question Generator

Generates quiz questions from textbook/notebook images using Gemini 3 Pro.
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
import pillow_heif

load_dotenv()

# Register HEIF/HEIC support with Pillow
pillow_heif.register_heif_opener()

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}

# Gemini model used for question generation. Override with the GEMINI_MODEL
# environment variable.
DEFAULT_MODEL = "gemini-3.5-flash"

GENERATION_PROMPT = """Jsi zkušený pedagog, který vytváří kvízové otázky pro děti. Všechny otázky a odpovědi piš ČESKY.

Analyzuj KAŽDÝ poskytnutý obrázek z učebnice a/nebo sešitu. Tyto obrázky pokrývají konkrétní téma, které se žáci potřebují naučit.

KRITICKY DŮLEŽITÉ - MNOŽSTVÍ OTÁZEK:
- Vygeneruj MINIMÁLNĚ 3-5 otázek NA KAŽDOU STRÁNKU/OBRÁZEK
- Pro 20 stránek musíš vygenerovat MINIMÁLNĚ 60-100 otázek
- Projdi KAŽDOU stránku a extrahuj z ní VŠECHNY klíčové informace
- NIKDY negeneruj méně než 50 otázek, pokud máš více než 10 stránek

Tvým úkolem je vytvořit VYČERPÁVAJÍCÍ sadu kvízových otázek, které:
1. Pokryjí VEŠKERÝ materiál zobrazený na obrázcích - KAŽDÝ fakt, pojem, definici, příklad
2. Testují porozumění, ne jen memorování
3. Jsou přiměřené úrovni ročníku podle materiálu
4. Používají jasný a srozumitelný jazyk

Co vše musíš pokrýt z každé stránky:
- Všechny definice a pojmy
- Všechny příklady a ilustrace
- Všechna fakta a čísla
- Všechny vztahy a souvislosti
- Všechny nadpisy a podnadpisy jako témata

Vytvoř otázky ve TŘECH formátech:
1. **multiple_choice**: Pro koncepty, kde rozlišování mezi možnostmi testuje porozumění
2. **true_false**: Pro faktická tvrzení, která lze jasně ověřit
3. **fill_blank**: Pro klíčové pojmy, definice nebo doplňování důležitých výroků (použij ___ pro prázdné místo)

Pro každou otázku zvol formát, který NEJLÉPE testuje danou znalost.

DŮLEŽITÉ pro fill_blank otázky:
- Odpověď musí být jedno slovo nebo krátká fráze (max 2-3 slova)
- Odpověď musí být jednoznačná - měla by existovat pouze jedna správná odpověď
- Prázdné místo označ pomocí ___

Odpověz JSON objektem v tomto přesném formátu:
{
  "topic": "Popisný název tématu podle obsahu",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Jaké je hlavní město Francie?",
      "options": ["Londýn", "Paříž", "Berlín", "Madrid"],
      "answer": 1,
      "explanation": "Paříž je hlavní město Francie."
    },
    {
      "type": "true_false",
      "question": "Voda vře při 100 stupních Celsia na hladině moře.",
      "answer": true,
      "explanation": "Při standardním atmosférickém tlaku (hladina moře) vře voda přesně při 100 °C."
    },
    {
      "type": "fill_blank",
      "question": "Proces, kterým rostliny vyrábějí potravu pomocí slunečního světla, se nazývá ___.",
      "answer": "fotosyntéza",
      "explanation": "Fotosyntéza je proces, kterým rostliny přeměňují sluneční světlo na energii."
    }
  ]
}

PAMATUJ: Vygeneruj MINIMUM 3-5 otázek z KAŽDÉ stránky. Buď důkladný!

Odpověz POUZE JSON objektem, žádný další text."""


def load_image_bytes(image_path: Path) -> tuple[bytes, str]:
    """Load an image and return its raw bytes with its mime type.

    HEIC/HEIF images are converted to JPEG for API compatibility.
    """
    extension = image_path.suffix.lower()

    # HEIC/HEIF need to be converted to JPEG for API compatibility
    if extension in {".heic", ".heif"}:
        import io

        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=95)
            return buffer.getvalue(), "image/jpeg"

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mime_type = mime_types.get(extension, "image/jpeg")

    return image_path.read_bytes(), mime_type


def get_images_from_directory(directory: Path) -> list[Path]:
    """Get all supported image files from a directory, sorted by name."""
    images = []
    for ext in SUPPORTED_EXTENSIONS:
        images.extend(directory.glob(f"*{ext}"))
        images.extend(directory.glob(f"*{ext.upper()}"))
    return sorted(set(images))


def question_problem(q) -> str | None:
    """Return a human-readable reason a question is invalid, or None if valid."""
    if not isinstance(q, dict):
        return "not an object"

    question = q.get("question")
    if not isinstance(question, str) or not question.strip():
        return "missing question text"

    q_type = q.get("type")
    if q_type == "multiple_choice":
        options = q.get("options")
        if not isinstance(options, list) or len(options) < 2:
            return "needs at least 2 options"
        if not all(isinstance(o, str) and o.strip() for o in options):
            return "options must be non-empty strings"
        answer = q.get("answer")
        # bool is a subclass of int, so reject it explicitly for an index.
        if isinstance(answer, bool) or not isinstance(answer, int):
            return "answer must be an option index"
        if not 0 <= answer < len(options):
            return f"answer index out of range (0..{len(options) - 1})"
    elif q_type == "true_false":
        if not isinstance(q.get("answer"), bool):
            return "answer must be true or false"
    elif q_type == "fill_blank":
        answer = q.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            return "answer must be a non-empty string"
    else:
        return f"unknown type: {q_type!r}"

    return None


def validate_quiz(quiz_data) -> dict:
    """Validate the generated quiz, dropping malformed questions.

    Returns a cleaned quiz dict. Exits if the payload is structurally
    unusable (not an object, no topic, or no valid questions survive).
    """
    if not isinstance(quiz_data, dict):
        print("Error: model did not return a JSON object.")
        sys.exit(1)

    topic = quiz_data.get("topic")
    if not isinstance(topic, str) or not topic.strip():
        print("Error: quiz is missing a 'topic' string.")
        sys.exit(1)

    raw_questions = quiz_data.get("questions")
    if not isinstance(raw_questions, list) or not raw_questions:
        print("Error: quiz has no 'questions' list.")
        sys.exit(1)

    valid = []
    for i, q in enumerate(raw_questions):
        problem = question_problem(q)
        if problem:
            print(f"  ! Skipping question {i + 1}: {problem}")
            continue
        valid.append(q)

    if not valid:
        print("Error: no valid questions in the model response.")
        sys.exit(1)

    dropped = len(raw_questions) - len(valid)
    if dropped:
        print(f"Dropped {dropped} malformed question(s).")

    return {"topic": topic.strip(), "questions": valid}


def generate_questions(topic_dir: Path, output_dir: Path) -> Path:
    """Generate quiz questions from images in the topic directory."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment variables.")
        print("Please set it in your .env file.")
        sys.exit(1)

    images = get_images_from_directory(topic_dir)
    if not images:
        print(f"Error: No images found in {topic_dir}")
        print(f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")
        sys.exit(1)

    print(f"Found {len(images)} images in {topic_dir}")
    for img in images:
        print(f"  - {img.name}")

    client = genai.Client(api_key=api_key)

    contents = []
    for image_path in images:
        print(f"Loading {image_path.name}...")
        image_bytes, mime_type = load_image_bytes(image_path)
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))

    contents.append(types.Part.from_text(text=GENERATION_PROMPT))

    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    print(f"\nSending to {model} for analysis...")
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=32768,
            response_mime_type="application/json",
        ),
    )

    response_text = response.text
    if not response_text:
        print("Error: model returned no text (response may have been blocked).")
        feedback = getattr(response, "prompt_feedback", None)
        if feedback:
            print(f"Prompt feedback: {feedback}")
        sys.exit(1)

    try:
        quiz_data = json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        print("(The response may have been truncated; try lowering the page count.)")
        print("Raw response:")
        print(response_text)
        sys.exit(1)

    quiz_data = validate_quiz(quiz_data)

    topic_name = topic_dir.name
    output_file = output_dir / f"{topic_name}.json"

    output_dir.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(quiz_data, f, indent=2, ensure_ascii=False)

    question_count = len(quiz_data.get("questions", []))
    print(f"\nGenerated {question_count} questions")
    print(f"Saved to: {output_file}")

    type_counts = {}
    for q in quiz_data.get("questions", []):
        q_type = q.get("type", "unknown")
        type_counts[q_type] = type_counts.get(q_type, 0) + 1

    print("\nQuestion breakdown:")
    for q_type, count in sorted(type_counts.items()):
        print(f"  - {q_type}: {count}")

    return output_file


def main():
    parser = argparse.ArgumentParser(
        description="Generate quiz questions from textbook/notebook images using Gemini 3 Pro"
    )
    parser.add_argument(
        "topic",
        help="Topic name (corresponds to directory name in topics/)",
    )
    parser.add_argument(
        "--topics-dir",
        type=Path,
        default=Path("topics"),
        help="Directory containing topic folders (default: topics/)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("quizzes"),
        help="Output directory for generated quizzes (default: quizzes/)",
    )

    args = parser.parse_args()

    topic_dir = args.topics_dir / args.topic
    if not topic_dir.exists():
        print(f"Error: Topic directory not found: {topic_dir}")
        print(f"\nTo create a new topic, run:")
        print(f"  mkdir -p {topic_dir}")
        print(f"  # Then add images of textbook pages to {topic_dir}/")
        sys.exit(1)

    if not topic_dir.is_dir():
        print(f"Error: {topic_dir} is not a directory")
        sys.exit(1)

    generate_questions(topic_dir, args.output_dir)


if __name__ == "__main__":
    main()
