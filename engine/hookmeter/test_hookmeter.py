"""Pure-logic tests:  python3 -m unittest engine/hookmeter/test_hookmeter.py"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hm_stats  # noqa: E402
import experiment  # noqa: E402


class StatsTest(unittest.TestCase):
    def test_rank_ties(self):
        self.assertEqual(hm_stats.rank([10, 20, 20, 30]), [1, 2.5, 2.5, 4])

    def test_spearman_perfect_and_inverse(self):
        self.assertAlmostEqual(hm_stats.spearman([1, 2, 3, 4], [10, 40, 90, 160])[0], 1.0)
        self.assertAlmostEqual(hm_stats.spearman([1, 2, 3, 4], [4, 3, 2, 1])[0], -1.0)

    def test_spearman_skips_missing_and_constant(self):
        rho, n = hm_stats.spearman([1, None, 3, 4], [1, 2, None, 4])
        self.assertIsNone(rho)
        self.assertEqual(n, 2)
        self.assertIsNone(hm_stats.spearman([1, 1, 1], [1, 2, 3])[0])

    def test_permutation_exact_n5(self):
        p = hm_stats.permutation_p([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])
        self.assertAlmostEqual(p, 2 / 120)
        self.assertAlmostEqual(hm_stats.min_possible_p(5), 2 / 120)

    def test_permutation_monte_carlo_noise(self):
        import random
        r = random.Random(1)
        xs = [r.random() for _ in range(30)]
        ys = [r.random() for _ in range(30)]
        self.assertGreater(hm_stats.permutation_p(xs, ys, n_perm=2000), 0.05)

    def test_bh(self):
        q = hm_stats.benjamini_hochberg([0.01, 0.04, None, 0.03])
        self.assertIsNone(q[2])
        self.assertAlmostEqual(q[0], 0.03)
        self.assertAlmostEqual(q[1], 0.04)


class MetricsTest(unittest.TestCase):
    def test_arabic_headers_and_numbers(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as f:
            f.write("الملف,نسبة التخطي,متوسط وقت المشاهدة,المشاهدات\n# تعليق\na.mp4,٣٨%,0:07,\"12,500\"\n")
        rows = experiment.read_metrics(f.name)
        os.unlink(f.name)
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["skip_rate"], 38)
        self.assertEqual(r["avg_watch_sec"], 7)
        self.assertEqual(r["views"], 12500)
        m = experiment.derive({**r, "duration_sec": 14})
        self.assertEqual(m["hold_pct"], 62)
        self.assertEqual(m["avg_watch_pct"], 50)

    def test_k_suffix(self):
        self.assertEqual(experiment._num("12.5K"), 12500)


if __name__ == "__main__":
    unittest.main()
