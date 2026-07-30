"""Write minimal solid-color PNGs for Expo assets (no Pillow required)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def solid_png(path: Path, size: int, rgb: tuple[int, int, int]) -> None:
    r, g, b = rgb
    raw = b"".join(b"\x00" + bytes([r, g, b]) * size for _ in range(size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(data)


def main() -> None:
    assets = Path(__file__).resolve().parent.parent / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    color = (31, 58, 46)  # forest
    for name, size in [
        ("icon.png", 1024),
        ("adaptive-icon.png", 1024),
        ("splash-icon.png", 512),
        ("favicon.png", 48),
    ]:
        solid_png(assets / name, size, color)
        print("wrote", name)


if __name__ == "__main__":
    main()
