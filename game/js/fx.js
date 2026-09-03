/* fx.js — Pháo hoa, vẽ trên một canvas phủ toàn màn hình.
 *
 * Nhận lệnh "nổ tại điểm này, màu này" rồi chạy. Không biết luật chơi.
 * Hạt sống lâu hơn ô bị xoá — cố ý, để dư âm kéo dài sau khi lưới đã sạch.
 */
"use strict";

const PER_CELL = 14;      // 14 hạt / ô. Xoá 3 hàng cùng lúc vẫn dưới 400 hạt.
const GRAVITY  = 0.16;    // đủ để thấy đường cong parabol
const FRICTION = 0.985;   // hạt chậm dần thay vì bay đều

export class Fx {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.raf = null;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.canvas.style.width  = innerWidth + "px";
    this.canvas.style.height = innerHeight + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Bắn hạt từ tâm ô ra mọi hướng, mang đúng màu của thứ vừa biến mất. */
  burst(x, y, color) {
    for (let i = 0; i < PER_CELL; i++) {
      const a  = Math.random() * Math.PI * 2;
      const sp = 1.6 + Math.random() * 4.2;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.2,     // lực đẩy lên, để hạt vổng trước khi rơi
        life: 1,
        decay: 0.014 + Math.random() * 0.02,
        size: 1.6 + Math.random() * 3,
        color: color || "#ffd166"
      });
    }
    if (!this.raf) this.raf = requestAnimationFrame(() => this.tick());
  }

  tick() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    // Cộng sáng: chỗ nhiều hạt chồng lên nhau tự cháy trắng — đây là thứ làm
    // nó trông giống pháo hoa thật.
    ctx.globalCompositeOperation = "lighter";

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.life -= p.decay;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }

      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);  // hạt vừa mờ vừa nhỏ lại
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (this.particles.length) {
      this.raf = requestAnimationFrame(() => this.tick());
    } else {
      this.raf = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }
}
