"""Compatibility wrapper for the root demo-data seed script."""
from __future__ import annotations

import asyncio
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.seed import seed


if __name__ == "__main__":
    asyncio.run(seed())
