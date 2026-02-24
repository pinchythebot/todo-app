"""
Pytest configuration for E2E tests.

Sets the LD_LIBRARY_PATH environment variable so Playwright can find
the system libraries needed to run the headless Chromium browser.
"""

import os

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
