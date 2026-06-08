#!/usr/bin/env python3
"""Tests for the quiz generator's output validation."""

import unittest

from generate import question_problem, validate_quiz


def mc(answer=0, options=("A", "B", "C")):
    return {"type": "multiple_choice", "question": "Q?", "options": list(options), "answer": answer}


class QuestionProblemTest(unittest.TestCase):
    def test_valid_multiple_choice(self):
        self.assertIsNone(question_problem(mc()))

    def test_valid_true_false(self):
        self.assertIsNone(question_problem({"type": "true_false", "question": "Q?", "answer": True}))

    def test_valid_fill_blank(self):
        self.assertIsNone(question_problem({"type": "fill_blank", "question": "___?", "answer": "x"}))

    def test_missing_question_text(self):
        self.assertIsNotNone(question_problem({"type": "true_false", "question": "  ", "answer": True}))

    def test_unknown_type(self):
        self.assertIsNotNone(question_problem({"type": "essay", "question": "Q?"}))

    def test_mc_answer_out_of_range(self):
        self.assertIsNotNone(question_problem(mc(answer=5)))

    def test_mc_answer_negative(self):
        self.assertIsNotNone(question_problem(mc(answer=-1)))

    def test_mc_boolean_answer_rejected(self):
        # bool is a subclass of int and must not be accepted as an index
        self.assertIsNotNone(question_problem(mc(answer=True)))

    def test_mc_too_few_options(self):
        self.assertIsNotNone(question_problem(mc(options=("only",))))

    def test_true_false_non_bool_answer(self):
        self.assertIsNotNone(question_problem({"type": "true_false", "question": "Q?", "answer": "yes"}))

    def test_fill_blank_empty_answer(self):
        self.assertIsNotNone(question_problem({"type": "fill_blank", "question": "Q?", "answer": ""}))


class ValidateQuizTest(unittest.TestCase):
    def test_drops_invalid_keeps_valid(self):
        result = validate_quiz({"topic": "T", "questions": [mc(), mc(answer=9)]})
        self.assertEqual(len(result["questions"]), 1)
        self.assertEqual(result["topic"], "T")

    def test_strips_topic_whitespace(self):
        result = validate_quiz({"topic": "  T  ", "questions": [mc()]})
        self.assertEqual(result["topic"], "T")

    def test_exits_when_not_a_dict(self):
        with self.assertRaises(SystemExit):
            validate_quiz([1, 2, 3])

    def test_exits_without_topic(self):
        with self.assertRaises(SystemExit):
            validate_quiz({"questions": [mc()]})

    def test_exits_with_empty_questions(self):
        with self.assertRaises(SystemExit):
            validate_quiz({"topic": "T", "questions": []})

    def test_exits_when_all_questions_invalid(self):
        with self.assertRaises(SystemExit):
            validate_quiz({"topic": "T", "questions": [mc(answer=9)]})


if __name__ == "__main__":
    unittest.main()
