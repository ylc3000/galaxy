// ===== PARTICLE LAYER (2D Foreground) =====
// Based on 2.html with color synchronization

import { ColorUtils, MathUtils } from './utils.js';

export class ParticleLayer {
    constructor(canvas, eventBus) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.eventBus = eventBus;

        // Configuration
        this.config = {
            particleCount: 1200,
            ease: 0.08,
            mouseInfluenceRadius: 120,      // 增大影响范围
            mouseRepulsionForce: 3,         // 排斥力度
            mouseScaleMultiplier: 3.5,      // 放大倍数
            baseRadius: 1.5,
            maxRadius: 4.5
        };

        // State
        this.particles = [];
        this.mouse = { x: -1000, y: -1000 };
        this.currentMode = 'spectrum'; // Changed from 'sync' to make particles visible on load
        this.width = 0;
        this.height = 0;
        this.cx = 0;
        this.cy = 0;
        this.isAnimating = true;
        this.galaxyColors = []; // Colors from galaxy layer



        this.init();
    }

    init() {
        this.resize();
        this.createParticles();

        // Listen for galaxy color updates
        this.eventBus.on('galaxy:colorUpdate', (colors) => {
            this.galaxyColors = colors;
            if (this.currentMode === 'sync') {
                this.syncWithGalaxy();
            }
        });

        // Color cube events removed - no repulsion effect

        window.addEventListener('resize', () => this.resize());
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push(new Particle(this.width, this.height));
        }
        this.updateTargets();
    }

    setMode(mode) {
        const previousMode = this.currentMode;
        this.currentMode = mode;
        this.updateTargets();
        
        // If switching FROM sync mode, instantly snap particles to new targets
        // This prevents particles from being stuck off-screen
        if (previousMode === 'sync' && mode !== 'sync') {
            this.particles.forEach(p => {
                p.x = p.tx;
                p.y = p.ty;
            });
        }
    }

    syncWithGalaxy() {
        // Sync particle colors with galaxy colors
        if (this.galaxyColors.length > 0) {
            this.particles.forEach((p, i) => {
                const colorIndex = i % this.galaxyColors.length;
                const color = this.galaxyColors[colorIndex];
                if (color && color.hsl) {
                    p.h = color.hsl.h;
                    p.s = color.hsl.s;
                    p.l = color.hsl.l;
                }
            });
        }
    }

    updateTargets() {
        this.particles.forEach(p => {
            if (this.currentMode === 'spectrum') {
                // Map X to Hue, Y to Lightness
                const padding = 50;
                p.tx = padding + (p.h / 360) * (this.width - padding * 2);
                p.ty = padding + ((100 - p.l) / 100) * (this.height - padding * 2);
                p.tx += (Math.random() - 0.5) * 10;

            } else if (this.currentMode === 'wheel') {
                // Polar Coordinates
                const angle = (p.h * Math.PI) / 180;
                const radius = (p.s / 100) * (Math.min(this.width, this.height) * 0.35);
                p.tx = this.cx + Math.cos(angle) * radius;
                p.ty = this.cy + Math.sin(angle) * radius;

            } else if (this.currentMode === 'cylinder') {
                // Faux-3D Cylinder
                const angle = (p.h * Math.PI) / 180;
                const cylinderRadius = 150;
                p.tx = this.cx + Math.cos(angle) * cylinderRadius * 1.5;
                p.ty = (this.height * 0.2) + ((100 - p.l) / 100) * (this.height * 0.6) + Math.sin(angle) * 40;

            } else if (this.currentMode === 'sync') {
                // Sync mode: particles follow mouse in a flowing pattern
                const angle = (p.h * Math.PI) / 180;
                const radius = (p.s / 100) * 100;
                p.tx = this.mouse.x + Math.cos(angle) * radius;
                p.ty = this.mouse.y + Math.sin(angle) * radius;
            }
        });
    }

    onMouseMove(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;

        if (this.currentMode === 'sync') {
            this.updateTargets();
        }
    }

    animate() {
        if (!this.isAnimating) return;

        // Clear with slight transparency for trail effect
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            p.update(this.mouse, this.config);
            p.draw(this.ctx);
        });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.cx = this.width / 2;
        this.cy = this.height / 2;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.updateTargets();
    }

    getParticleCount() {
        return this.particles.length;
    }

    dispose() {
        this.isAnimating = false;
        this.particles = [];
    }
}

class Particle {
    constructor(width, height) {
        // Color properties (HSL)
        const vibrantColor = ColorUtils.randomVibrantColor();
        this.h = vibrantColor.h;
        this.s = vibrantColor.s;
        this.l = vibrantColor.l;

        // Dimensions
        this.radius = 1.5 + Math.random() * 2;
        this.baseRadius = this.radius;
        this.targetRadius = this.radius;  // 目标半径（用于平滑过渡）

        // Position (Current)
        this.x = Math.random() * width;
        this.y = Math.random() * height;

        // Position (Target)
        this.tx = this.x;
        this.ty = this.y;

        // Glow effect
        this.glowIntensity = 0;  // 发光强度 0-1
    }

    update(mouse, config) {
        // Move towards target (Lerp)
        this.x += (this.tx - this.x) * config.ease;
        this.y += (this.ty - this.y) * config.ease;

        // === Mouse Interaction ===
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < config.mouseInfluenceRadius) {
            // 计算影响强度（距离越近，影响越大）
            const influence = 1 - (dist / config.mouseInfluenceRadius);
            
            // 1. 放大效果（基于距离的渐进式放大）
            this.targetRadius = this.baseRadius * (1 + influence * (config.mouseScaleMultiplier - 1));
            
            // 2. 发光效果
            this.glowIntensity = Math.max(this.glowIntensity, influence * 0.8);
            
            // 3. 排斥效果（距离越近，推力越大）
            const angle = Math.atan2(dy, dx);
            const repulsionForce = config.mouseRepulsionForce * influence;
            this.x -= Math.cos(angle) * repulsionForce;
            this.y -= Math.sin(angle) * repulsionForce;
        } else {
            // 恢复原始大小
            this.targetRadius = this.baseRadius;
            this.glowIntensity *= 0.9;  // 发光逐渐消失
        }

        // 平滑过渡半径（避免突变）
        this.radius += (this.targetRadius - this.radius) * 0.15;
    }

    draw(ctx) {
        // 发光效果（外圈光晕）
        if (this.glowIntensity > 0.05) {
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius * 2.5
            );
            gradient.addColorStop(0, `hsla(${this.h}, ${this.s}%, ${this.l}%, ${this.glowIntensity * 0.6})`);
            gradient.addColorStop(0.5, `hsla(${this.h}, ${this.s}%, ${this.l}%, ${this.glowIntensity * 0.3})`);
            gradient.addColorStop(1, `hsla(${this.h}, ${this.s}%, ${this.l}%, 0)`);
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // 主体粒子
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // 根据发光强度调整亮度
        const adjustedL = Math.min(this.l + this.glowIntensity * 20, 90);
        ctx.fillStyle = `hsl(${this.h}, ${this.s}%, ${adjustedL}%)`;
        ctx.fill();

        // 高亮边缘（增强立体感）
        if (this.glowIntensity > 0.1) {
            ctx.strokeStyle = `hsla(${this.h}, ${this.s}%, ${Math.min(this.l + 30, 100)}%, ${this.glowIntensity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}
