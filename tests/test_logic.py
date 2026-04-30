import unittest

from logic import (
    advance_level,
    build_task_levels,
    choose_start_level,
    looks_like_resistance,
    simplify_level,
)


class LogicTests(unittest.TestCase):
    def test_build_task_levels_returns_four_steps(self) -> None:
        levels = build_task_levels("Learn Python loops", "study", 10)
        self.assertEqual(len(levels), 4)
        self.assertIn("Learn Python loops", levels[-1])

    def test_low_energy_starts_gently(self) -> None:
        level = choose_start_level("low", "30m", 3)
        self.assertEqual(level, 1)

    def test_simplify_level_never_goes_negative(self) -> None:
        self.assertEqual(simplify_level(0), 0)
        self.assertEqual(simplify_level(2), 1)

    def test_advance_level_caps_at_max(self) -> None:
        self.assertEqual(advance_level(2, 3), 3)
        self.assertEqual(advance_level(3, 3), 3)

    def test_resistance_detection_is_deterministic(self) -> None:
        self.assertTrue(looks_like_resistance("I can't do this right now"))
        self.assertFalse(looks_like_resistance("Started"))


if __name__ == "__main__":
    unittest.main()
