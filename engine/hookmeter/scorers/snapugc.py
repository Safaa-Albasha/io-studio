"""SnapUGC engagement model (Li et al., ECCV 2024) — NOT runnable here, by design.

Why it is a stub (checked 2026-11):
- No licence file in github.com/dasongli1/SnapUGC_Engagement → all rights
  reserved by default; we may not copy its code or weights into I/O Studio.
- Weights are only on Google Drive / Baidu (EVQA.pth, mPLUG2_MSRVTT_Caption.pth,
  net_distort6_g_latest.pth, r3d18_K_200ep.pth).
- The inference script is GPU-only as written (.cuda() everywhere), pinned to
  Python 3.8 / PyTorch 1.11 / CUDA 11.3, and also needs TensorFlow + YAMNet,
  the Stable Diffusion v1-4 text encoder (CreativeML OpenRAIL-M), bert-large and
  the mPLUG-2 captioner (~0.9B params).
- Its text inputs (title, description, auto caption) are English-only.
- It predicts ECR/NAWP for Snapchat Spotlight, not Instagram.

If a user runs it themselves, they can paste its per-video output into
metrics/feature CSV as an extra column — see README (external scores).
"""
NAME = "snapugc"
FEATURES = {"snapugc_ecr": ("SnapUGC: نسبة الاستمرار المتوقعة", "+", "")}


def available() -> tuple[bool, str]:
    return False, "SnapUGC غير مدعوم داخل الإضافة (بدون رخصة، GPU فقط، نصوص إنجليزية) — أضف نتائجه كعمود خارجي"


def score(path, seconds=3.0, **_):
    raise RuntimeError(available()[1])
