"use client";

import { useEffect, useRef } from "react";

// ── ECHOES INTERACTIVE GALAXY BACKGROUND ──────────────────────────────────
// Ported from Vzero "Interactive Particle Galaxy" template.
// Settings panel, audio reactivity, presets, fullscreen, and download UI
// have been stripped - this is a pure background layer.
// Mouse is tracked via window events so the canvas stays pointer-events:none
// and never intercepts clicks on the app.
// Old static star field is preserved in comments at the bottom of this file.

// Echoes warm-gold palette
const COLORS = ["#c9963a", "#d4a042", "#e8b95a", "#b07828", "#f2ead8", "#a89070"];
const CONN_RGB = [201, 150, 58]; // gold channel for connection lines

const PARTICLE_COUNT = 120;
const BASE_SPEED     = 1.4;
const BASE_SIZE      = 2;
const CONN_DIST      = 130;
// Background fill alpha - lower = longer trails
const BG_ALPHA = "rgba(10, 8, 4, 0.18)";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();

    // Track mouse position through the window so the canvas can stay
    // pointer-events:none and never block app interactions
    let mouseX = canvas.width  / 2;
    let mouseY = canvas.height / 2;
    function onMouseMove(e: MouseEvent) { mouseX = e.clientX; mouseY = e.clientY; }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove",  onTouchMove, { passive: true });

    // ── Particle class ────────────────────────────────────────────────────
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      baseSpeedX: number;
      baseSpeedY: number;
      color: string;

      constructor() {
        this.x         = Math.random() * canvas!.width;
        this.y         = Math.random() * canvas!.height;
        this.size      = Math.random() * BASE_SIZE * 1.5 + 0.5;
        this.baseSpeedX = (Math.random() * 2 - 1) * BASE_SPEED;
        this.baseSpeedY = (Math.random() * 2 - 1) * BASE_SPEED;
        this.speedX    = this.baseSpeedX;
        this.speedY    = this.baseSpeedY;
        this.color     = COLORS[Math.floor(Math.random() * COLORS.length)];
      }

      update() {
        const dx   = this.x - mouseX;
        const dy   = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Gentle repulsion within 120px radius
        if (dist < 120 && dist > 0) {
          const angle = Math.atan2(dy, dx);
          const force = (120 - dist) / 12;
          this.speedX += Math.cos(angle) * force * 0.18;
          this.speedY += Math.sin(angle) * force * 0.18;
        }

        // Speed cap
        const maxSpeed = BASE_SPEED * 2.5;
        this.speedX = Math.max(-maxSpeed, Math.min(maxSpeed, this.speedX));
        this.speedY = Math.max(-maxSpeed, Math.min(maxSpeed, this.speedY));

        // Drift back toward natural velocity
        this.speedX = this.speedX * 0.97 + this.baseSpeedX * 0.03;
        this.speedY = this.speedY * 0.97 + this.baseSpeedY * 0.03;

        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around screen edges
        const W = canvas!.width;
        const H = canvas!.height;
        if (this.x < 0)  this.x = W;
        if (this.x > W)  this.x = 0;
        if (this.y < 0)  this.y = H;
        if (this.y > H)  this.y = 0;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = this.color;
        ctx!.fill();
      }
    }

    // Create particle pool
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    // ── Animation loop ────────────────────────────────────────────────────
    function animate() {
      if (!canvas || !ctx) return;
      animId = requestAnimationFrame(animate);

      // Semi-transparent fill creates the subtle trail / fade effect
      ctx.fillStyle = BG_ALPHA;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (const p of particles) {
        p.update();
        p.draw();
      }

      // Draw gold connection lines between nearby particles
      const [r, g, b] = CONN_RGB;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        // Limit inner loop to avoid O(n^2) on larger counts
        const limit = Math.min(particles.length, i + 14);
        for (let j = i + 1; j < limit; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONN_DIST) {
            const opacity = (1 - dist / CONN_DIST) * 0.17;
            ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    animId = requestAnimationFrame(animate);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── OLD STATIC STAR FIELD (preserved as fallback) ─────────────────────────
// To restore: swap the useEffect body below back in place of the galaxy one.
//
// interface Star {
//   x: number; y: number;
//   radius: number;
//   opacity: number; opacityMin: number; opacityMax: number;
//   opacityDir: number; opacitySpeed: number;
//   vx: number; vy: number;
//   type: number; colorIdx: number;
// }
//
// const OLD_COLORS: [number, number, number][] = [
//   [245, 235, 200], [255, 248, 220],
//   [201, 150,  58], [232, 185,  90],
//   [255, 220, 150], [200, 200, 220],
// ];
//
// function rand(a: number, b: number) { return a + Math.random() * (b - a); }
//
// function makeStar(W: number, H: number): Star {
//   const roll = Math.random();
//   let type = roll < 0.40 ? 0 : roll < 0.78 ? 1 : roll < 0.95 ? 2 : 3;
//   const radiusMap = [rand(0.4,0.9), rand(0.8,1.4), rand(1.4,2.2), rand(2.2,3.5)];
//   const opMinMap  = [0.08, 0.25, 0.30, 0.45];
//   const opMaxMap  = [0.35, 0.70, 0.80, 0.95];
//   const speedMap  = [rand(0.002,0.005), rand(0.003,0.008), rand(0.004,0.009), rand(0.005,0.01)];
//   const opMin = opMinMap[type]; const opMax = opMaxMap[type];
//   const drifts = Math.random() < 0.15;
//   return {
//     x: rand(0,W), y: rand(0,H),
//     radius: radiusMap[type],
//     opacity: rand(opMin, opMax), opacityMin: opMin, opacityMax: opMax,
//     opacityDir: Math.random() < 0.5 ? 1 : -1,
//     opacitySpeed: speedMap[type],
//     vx: drifts ? (Math.random() - 0.5) * 0.04 : 0,
//     vy: drifts ? rand(-0.04, -0.01) : 0,
//     type,
//     colorIdx: (type === 2 || type === 3) ? Math.floor(rand(2,5)) : Math.floor(rand(0,2)),
//   };
// }
//
// OLD useEffect body:
// const STAR_COUNT = 180;
// const stars: Star[] = [];
// const TARGET_FPS = 24;
// const FRAME_MS = 1000 / TARGET_FPS;
// let lastTime = 0;
// resize();
// for (let i = 0; i < STAR_COUNT; i++) stars.push(makeStar(canvas.width, canvas.height));
// function draw(timestamp: number) {
//   animId = requestAnimationFrame(draw);
//   if (timestamp - lastTime < FRAME_MS) return;
//   lastTime = timestamp;
//   if (!canvas || !ctx) return;
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   for (const s of stars) {
//     s.opacity += s.opacitySpeed * s.opacityDir;
//     if (s.opacity >= s.opacityMax) s.opacityDir = -1;
//     else if (s.opacity <= s.opacityMin) s.opacityDir = 1;
//     s.opacity = Math.max(0, Math.min(1, s.opacity));
//     s.x += s.vx; s.y += s.vy;
//     if (s.y < -5)              s.y = canvas.height + 5;
//     if (s.x < -5)              s.x = canvas.width  + 5;
//     if (s.x > canvas.width+5)  s.x = -5;
//     const [r2,g2,b2] = OLD_COLORS[s.colorIdx];
//     if (s.type === 3) { ctx.shadowColor = `rgba(${r2},${g2},${b2},${(s.opacity*0.5).toFixed(2)})`; ctx.shadowBlur = 14; }
//     else if (s.type === 2) { ctx.shadowColor = `rgba(${r2},${g2},${b2},${(s.opacity*0.3).toFixed(2)})`; ctx.shadowBlur = 7; }
//     else { ctx.shadowBlur = 0; }
//     ctx.beginPath();
//     ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
//     ctx.fillStyle = `rgba(${r2},${g2},${b2},${s.opacity.toFixed(2)})`;
//     ctx.fill();
//     if (s.type >= 2) ctx.shadowBlur = 0;
//   }
// }
// animId = requestAnimationFrame(draw);
