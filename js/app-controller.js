// ===== APPLICATION CONTROLLER =====
// Main controller that integrates all layers

import { EventBus, PerformanceMonitor, DOMUtils, AnimationController } from './utils.js';
import { GalaxyLayer } from './galaxy-layer.js';
import { ParticleLayer } from './particle-layer.js';
import { ColorCube } from './color-cube.js';

class CosmicLabApp {
    constructor() {
        // Core systems
        this.eventBus = new EventBus();
        this.perfMonitor = new PerformanceMonitor();
        this.animController = new AnimationController();

        // Layers
        this.galaxyLayer = null;
        this.particleLayer = null;
        this.colorCube = null;

        // State
        this.appState = {
            mode: 'explore', // 'explore' or 'analyze'
            selectedColors: [],
            palette: []
        };

        // DOM Elements
        this.elements = {
            loadingScreen: DOMUtils.getById('loading-screen'),
            modeDisplay: DOMUtils.getById('mode-display'),
            galaxyCount: DOMUtils.getById('galaxy-count'),
            fpsCounter: DOMUtils.getById('fps-counter')
        };

        this.init();
    }

    async init() {
        try {
            // Initialize layers
            await this.initializeLayers();

            // Setup event listeners
            this.setupEventListeners();

            // Palette functionality removed

            // Start animation loop
            this.animate();

            // Hide loading screen quickly (1s), then trigger Big Bang
            setTimeout(() => {
                DOMUtils.addClass(this.elements.loadingScreen, 'hidden');

                // Wait a tiny bit for the fade out to start, then BANG
                setTimeout(() => {
                    this.galaxyLayer.startBigBang();
                }, 500);

                console.log('🚀 Cosmic Color Lab initialized successfully!');
            }, 1000);

        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    async initializeLayers() {
        // Layer 1: Galaxy Background
        const galaxyContainer = DOMUtils.getById('galaxy-container');
        this.galaxyLayer = new GalaxyLayer(galaxyContainer, this.eventBus);

        // Layer 2: Color Cube Background
        const cubeBackgroundContainer = DOMUtils.getById('cube-background-container');
        this.colorCubeBackground = new ColorCube(cubeBackgroundContainer, this.eventBus);

        // Layer 3: Particle Foreground
        const particleCanvas = DOMUtils.getById('particle-canvas');
        this.particleLayer = new ParticleLayer(particleCanvas, this.eventBus);

        // Modal color cube removed

        // Update stats (只更新星系粒子数，因为我们移除了 particle-count 元素)
        DOMUtils.setText('galaxy-count', this.galaxyLayer.getParticleCount().toLocaleString());

        // Sample initial colors from galaxy
        this.sampleGalaxyColors();
    }

    startColorCubeGrowth() {
        // 不传入颜色数据，让 ColorCube 使用从 API 加载的真实颜色数据
        this.colorCubeBackground.show();
        
        console.log('🎨 Color Cube growth started');
    }

    generateSampleColors(count) {
        const colors = [];
        
        // 生成 RGB 立方体中均匀分布的颜色
        const steps = Math.ceil(Math.pow(count, 1/3)); // 立方根，确保 3D 均匀分布
        
        for (let r = 0; r < steps; r++) {
            for (let g = 0; g < steps; g++) {
                for (let b = 0; b < steps; b++) {
                    const red = Math.round((r / (steps - 1)) * 255);
                    const green = Math.round((g / (steps - 1)) * 255);
                    const blue = Math.round((b / (steps - 1)) * 255);
                    
                    const hsl = this.rgbToHslSimple(red, green, blue);
                    
                    colors.push({
                        r: red,
                        g: green,
                        b: blue,
                        hex: this.rgbToHex(red, green, blue),
                        hsl: hsl
                    });
                    
                    if (colors.length >= count) break;
                }
                if (colors.length >= count) break;
            }
            if (colors.length >= count) break;
        }
        
        return colors;
    }

    rgbToHslSimple(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: h * 360,
            s: s * 100,
            l: l * 100
        };
    }

    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    setupEventListeners() {
        // Mouse move (affects all layers)
        document.addEventListener('mousemove', (e) => {
            this.galaxyLayer.onMouseMove(e.clientX, e.clientY);
            this.particleLayer.onMouseMove(e.clientX, e.clientY);
        });

        // Click functionality removed

        // Big Bang complete event - 等待粒子稳定后触发 Color Cube
        this.eventBus.on('galaxy:bigBangComplete', () => {
            console.log('🌌 Big Bang complete, waiting for particles to stabilize...');
            // 等待 3 秒让粒子完全稳定
            setTimeout(() => {
                console.log('✨ Particles stabilized, starting Color Cube growth...');
                this.startColorCubeGrowth();
            }, 3000);
        });

        // Modal functionality removed

        // Color model selector removed - using RGB only

        // Action buttons
        const resetCameraBtn = document.getElementById('reset-camera');
        const toggleParticlesBtn = document.getElementById('toggle-particles');

        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.resetCameraView();
            });
        }

        if (toggleParticlesBtn) {
            toggleParticlesBtn.addEventListener('click', () => {
                this.toggleParticles();
            });
        }

        // Window resize removed (no modal)
    }

    sampleGalaxyColors() {
        // Periodically sample colors from galaxy and update particle layer
        setInterval(() => {
            if (this.appState.mode === 'explore') {
                const colors = this.galaxyLayer.sampleColorsInRegion(0, 0, 25);
                this.eventBus.emit('galaxy:colorUpdate', colors);
            }
        }, 2000);
    }

    setParticleMode(mode) {
        this.particleLayer.setMode(mode);
    }

    resetCameraView() {
        // 重置立方体相机到初始位置
        if (this.colorCubeBackground && this.colorCubeBackground.controls) {
            const controls = this.colorCubeBackground.controls;
            const camera = this.colorCubeBackground.camera;
            
            // 平滑过渡到初始位置
            this.animController.animate(
                'camera-reset',
                0,
                1,
                1000,
                (progress) => {
                    // 插值到目标位置
                    camera.position.x = camera.position.x + (180 - camera.position.x) * progress * 0.1;
                    camera.position.y = camera.position.y + (100 - camera.position.y) * progress * 0.1;
                    camera.position.z = camera.position.z + (180 - camera.position.z) * progress * 0.1;
                    controls.target.set(0, 0, 0);
                    controls.update();
                },
                () => {
                    console.log('🎯 Camera view reset');
                }
            );
        }
    }

    toggleParticles() {
        // 切换前景粒子显示/隐藏
        const canvas = this.particleLayer.canvas;
        const btn = document.getElementById('toggle-particles');
        
        if (canvas.style.opacity === '0') {
            // 显示粒子
            canvas.style.opacity = '1';
            DOMUtils.removeClass(btn, 'active');
            console.log('✨ Particles shown');
        } else {
            // 隐藏粒子
            canvas.style.opacity = '0';
            DOMUtils.addClass(btn, 'active');
            console.log('✨ Particles hidden');
        }
    }

    // Palette functionality removed

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update all layers
        this.galaxyLayer.animate();
        this.particleLayer.animate();

        // Update FPS
        const fps = this.perfMonitor.update();
        if (Math.random() > 0.95) {
            DOMUtils.setText('fps-counter', fps);
        }
    }

    dispose() {
        this.galaxyLayer.dispose();
        this.particleLayer.dispose();
        this.colorCubeBackground.dispose();
        this.eventBus.clear();
        this.animController.cancelAll();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cosmicLab = new CosmicLabApp();
    });
} else {
    window.cosmicLab = new CosmicLabApp();
}

export default CosmicLabApp;
