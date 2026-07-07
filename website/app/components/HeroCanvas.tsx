"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let ripples: Ripple[] = [];
    let frame = 0;

    const colors = [
      "59, 130, 246",   // emerald-500
      "139, 92, 246",   // cyan-500
      "6, 182, 212",    // cyan-500
      "99, 102, 241",   // emerald-500
    ];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);
    }

    function initParticles() {
      particles = [];
      const count = Math.min(80, Math.floor((canvas!.offsetWidth * canvas!.offsetHeight) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas!.offsetWidth,
          y: Math.random() * canvas!.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.2 - 0.05,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    function spawnRipple() {
      ripples.push({
        x: canvas!.offsetWidth / 2,
        y: canvas!.offsetHeight * 0.55,
        radius: 0,
        maxRadius: Math.min(canvas!.offsetWidth, canvas!.offsetHeight) * 0.4,
        opacity: 0.15,
      });
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);

      // Draw connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const lineOpacity = (1 - dist / 120) * 0.08;
            ctx!.strokeStyle = `rgba(0, 230, 118, ${lineOpacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      // Draw and update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Glow
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `rgba(${p.color}, ${p.opacity})`);
        gradient.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx!.fill();

        // Core dot
        ctx!.fillStyle = `rgba(${p.color}, ${p.opacity * 1.5})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Draw ripples (voice activation pulse)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.5;
        r.opacity *= 0.985;

        if (r.radius > r.maxRadius || r.opacity < 0.005) {
          ripples.splice(i, 1);
          continue;
        }

        ctx!.strokeStyle = `rgba(0, 230, 118, ${r.opacity})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx!.stroke();

        // Second ring offset
        if (r.radius > 20) {
          ctx!.strokeStyle = `rgba(79, 195, 247, ${r.opacity * 0.5})`;
          ctx!.beginPath();
          ctx!.arc(r.x, r.y, r.radius - 15, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }

      // Spawn ripple every ~180 frames (~3 seconds at 60fps)
      frame++;
      if (frame % 180 === 0) {
        spawnRipple();
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    spawnRipple();
    draw();

    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
