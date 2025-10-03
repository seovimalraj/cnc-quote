import os
import tempfile
import urllib.parse
import httpx
import hashlib


def download_to_temp(url: str, *, max_bytes: int = 80 * 1024 * 1024) -> str:
    """Download a URL to a temporary file and return the path.
    Enforces a simple size limit to avoid excessive resource use.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http(s) URLs are supported")

    with httpx.stream('GET', url, timeout=30.0) as r:
        r.raise_for_status()
        suffix = os.path.splitext(parsed.path)[1].lower() or ""
        fd, path = tempfile.mkstemp(suffix=suffix)
        size = 0
        try:
            with os.fdopen(fd, "wb") as f:
                for chunk in r.iter_bytes():
                    if chunk:
                        size += len(chunk)
                        if size > max_bytes:
                            raise ValueError("File exceeds maximum allowed size")
                        f.write(chunk)
        except Exception:
            try:
                os.remove(path)
            finally:
                raise
    return path


def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()
