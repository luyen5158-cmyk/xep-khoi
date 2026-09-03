/* audio.js — Ba tiếng động, tự tổng hợp bằng Web Audio. Không cần file âm thanh.
 *
 * Bắt buộc: trình duyệt và iOS chỉ cho phát âm thanh sau lần chạm đầu tiên của
 * người dùng. Phải gọi unlock() trong sự kiện chạm đầu tiên, nếu không cả ván
 * sẽ im lặng.
 */
"use strict";

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ac() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /** Gọi trong lần chạm đầu tiên của người dùng. */
  unlock() { this._ac(); }

  /** Đặt khối: sóng tam giác trượt 420 → 240 Hz. Nghe cả trăm lần một ván nên
   *  tuyệt đối không được chói. */
  place() {
    const a = this._ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(420, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(240, a.currentTime + 0.09);
    g.gain.setValueAtTime(0.14, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.1);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.11);
  }

  /** Nổ: hai lớp chồng nhau — nhiễu trắng qua bộ lọc quét xuống tạo tiếng
   *  "xoẹt", cộng một sóng sin trầm tạo cú "thịch" ở ngực.
   *  Xoá càng nhiều hàng, tiếng càng dài và càng sáng. */
  explode(lines) {
    const a = this._ac(); if (!a) return;
    const dur = 0.5 + lines * 0.08;

    const buf  = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
    }
    const src = a.createBufferSource(); src.buffer = buf;
    const flt = a.createBiquadFilter(); flt.type = "lowpass";
    flt.frequency.setValueAtTime(2600 + lines * 500, a.currentTime);
    flt.frequency.exponentialRampToValueAtTime(180, a.currentTime + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.34, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    src.connect(flt).connect(g).connect(a.destination);
    src.start();

    const o = a.createOscillator(), og = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(42, a.currentTime + 0.3);
    og.gain.setValueAtTime(0.4, a.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
    o.connect(og).connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.36);
  }

  /** Lên level: bốn nốt sóng vuông C-E-G-C, âm sắc 8-bit, gợi máy game cũ. */
  levelUp() {
    const a = this._ac(); if (!a) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      const t = a.currentTime + i * 0.085;
      o.type = "square";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + 0.17);
    });
  }
}
