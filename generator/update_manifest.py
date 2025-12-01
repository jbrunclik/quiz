#!/usr/bin/env python3
"""Updates the quiz manifest file with all available quizzes."""

import json
from datetime import datetime
from pathlib import Path


def update_manifest():
    quizzes_dir = Path("quizzes")
    manifest_path = quizzes_dir / "manifest.json"

    # Load existing manifest to preserve dates
    existing_dates = {}
    if manifest_path.exists():
        try:
            existing = json.loads(manifest_path.read_text())
            for q in existing.get("quizzes", []):
                if "dateAdded" in q:
                    existing_dates[q["file"]] = q["dateAdded"]
        except (json.JSONDecodeError, IOError):
            pass

    quizzes = []
    today = datetime.now().strftime("%Y-%m-%d")

    for f in quizzes_dir.glob("*.json"):
        if f.name == "manifest.json":
            continue
        try:
            data = json.loads(f.read_text())
            # Use existing date or today's date for new quizzes
            date_added = existing_dates.get(f.name, today)
            quizzes.append({
                "file": f.name,
                "topic": data.get("topic", f.stem),
                "questionCount": len(data.get("questions", [])),
                "dateAdded": date_added
            })
        except (json.JSONDecodeError, IOError):
            pass

    # Sort by date (newest first), then by topic name
    quizzes.sort(key=lambda q: (q["dateAdded"], q["topic"]), reverse=True)

    manifest = {"quizzes": quizzes}
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"Updated manifest with {len(quizzes)} quiz(es)")


if __name__ == "__main__":
    update_manifest()
