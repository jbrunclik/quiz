#!/usr/bin/env python3
"""Validate the committed quiz files and manifest stay consistent."""

import json
import unittest
from pathlib import Path

from generate import question_problem

QUIZZES_DIR = Path(__file__).resolve().parent.parent / "quizzes"
MANIFEST_PATH = QUIZZES_DIR / "manifest.json"


def quiz_files():
    return sorted(f for f in QUIZZES_DIR.glob("*.json") if f.name != "manifest.json")


class QuizFilesTest(unittest.TestCase):
    def test_every_quiz_has_only_valid_questions(self):
        for path in quiz_files():
            data = json.loads(path.read_text(encoding="utf-8"))
            self.assertIsInstance(data.get("topic"), str, f"{path.name}: missing topic")
            self.assertTrue(data.get("questions"), f"{path.name}: no questions")
            for i, q in enumerate(data["questions"]):
                problem = question_problem(q)
                self.assertIsNone(problem, f"{path.name} question {i + 1}: {problem}")


class ManifestTest(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    def test_manifest_lists_every_quiz_file(self):
        listed = {q["file"] for q in self.manifest["quizzes"]}
        on_disk = {f.name for f in quiz_files()}
        self.assertEqual(listed, on_disk)

    def test_manifest_counts_match_files(self):
        for entry in self.manifest["quizzes"]:
            data = json.loads((QUIZZES_DIR / entry["file"]).read_text(encoding="utf-8"))
            self.assertEqual(
                entry["questionCount"], len(data["questions"]), f"{entry['file']}: count mismatch"
            )

    def test_manifest_sorted_by_date_desc_then_topic_asc(self):
        keyed = [(q["dateAdded"], q["topic"]) for q in self.manifest["quizzes"]]
        expected = sorted(keyed, key=lambda k: k[1])
        expected.sort(key=lambda k: k[0], reverse=True)
        self.assertEqual(keyed, expected)


if __name__ == "__main__":
    unittest.main()
