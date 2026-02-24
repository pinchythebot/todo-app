"""
Pytest configuration for E2E tests.

Sets the LD_LIBRARY_PATH environment variable so Playwright can find
the system libraries needed to run the headless Chromium browser.

Also registers a ``browser_args`` fixture that supplies the extra
Chromium launch flags required inside Docker / CI containers where the
default sandbox and GPU settings cause the renderer to crash.
"""

import os
import pytest

# The libraries needed by the Playwright headless_shell are bundled in
# /tmp/alllibs and /tmp/local-libs (set up by the container environment).
_LIB_DIRS = [
    "/tmp/alllibs/usr/lib/aarch64-linux-gnu",
    "/tmp/local-libs/usr/lib/aarch64-linux-gnu",
    "/tmp/alllibs/usr/lib/x86_64-linux-gnu",
    "/tmp/local-libs/usr/lib/x86_64-linux-gnu",
]

existing_dirs = [d for d in _LIB_DIRS if os.path.isdir(d)]
if existing_dirs:
    current = os.environ.get("LD_LIBRARY_PATH", "")
    prepend = ":".join(existing_dirs)
    os.environ["LD_LIBRARY_PATH"] = f"{prepend}:{current}" if current else prepend

# ---------------------------------------------------------------------------
# Extra Chromium launch args for containerised / sandboxed environments.
# Without these the renderer process crashes immediately when loading a real
# page (the browser itself launches fine, but page navigation fails).
# ---------------------------------------------------------------------------
CHROMIUM_SANDBOX_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
]


@pytest.fixture(scope="session")
def browser_extra_args():
    """Return extra Chromium launch args needed in CI containers."""
    return CHROMIUM_SANDBOX_ARGS
