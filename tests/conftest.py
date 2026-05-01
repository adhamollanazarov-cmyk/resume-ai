from pathlib import Path
import sys

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(autouse=True)
def reset_analyze_rate_limiter() -> None:
    from app.main import analyze_rate_limiter

    analyze_rate_limiter.clear()
