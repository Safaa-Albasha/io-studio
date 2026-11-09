"""Scorer registry. Each scorer module exposes NAME, FEATURES, available(), score()."""
from . import baseline, snapugc

ALL = {m.NAME: m for m in (baseline, snapugc)}
