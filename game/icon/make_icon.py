#!/usr/bin/env python3
"""Sinh icon PNG cho PWA — vẽ bằng tay, không cần thư viện ngoài.

Giữ file này lại để đổi màu hay hình icon sau này thì chạy lại:
    python3 make_icon.py
Cụm khối được co vào trong vòng tròn an toàn 80% để icon maskable trên Android
không bị cắt mất góc.
"""
import struct, zlib

BG      = (0x0b, 0x10, 0x20)
COLORS  = [(0x5c, 0x9d, 0xff), (0xff, 0xd4, 0x3b),
           (0xff, 0x6b, 0x6b), (0x69, 0xdb, 0x7c)]

def rounded(px, S, x0, y0, w, h, r, color):
    """Vẽ hình chữ nhật bo góc, kèm vệt sáng trên và bóng tối dưới như ô trong game."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            dx = min(x - x0, x0 + w - 1 - x)
            dy = min(y - y0, y0 + h - 1 - y)
            if dx < r and dy < r and (r - dx) ** 2 + (r - dy) ** 2 > r * r:
                continue
            t = (y - y0) / h
            if   t < 0.07: k = 1.28      # vệt sáng trên
            elif t > 0.93: k = 0.72      # bóng tối dưới
            else:          k = 1.0
            px[y][x] = tuple(min(255, int(c * k)) for c in color)

def build(S):
    px = [[BG] * S for _ in range(S)]
    blk = round(S * 130 / 512)
    gap = round(S *  20 / 512)
    tot = blk * 2 + gap
    off = (S - tot) // 2
    rad = max(2, round(blk * 0.18))
    for i, (gy, gx) in enumerate([(0, 0), (0, 1), (1, 0), (1, 1)]):
        rounded(px, S,
                off + gx * (blk + gap), off + gy * (blk + gap),
                blk, blk, rad, COLORS[i])
    return px

def write_png(path, px):
    S = len(px)
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)
    print(path, S, "×", S, "—", len(png), "byte")

for size in (192, 512):
    write_png(f"icon-{size}.png", build(size))
