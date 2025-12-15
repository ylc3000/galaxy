// ===== APPLICATION CONTROLLER =====
// Main controller that integrates all layers

import { EventBus, PerformanceMonitor, DOMUtils, StorageUtils, AnimationController } from './utils.js';
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
            modal: DOMUtils.getById('color-cube-modal'),
            closeModal: DOMUtils.getById('close-modal'),
            modeDisplay: DOMUtils.getById('mode-display'),
            galaxyCount: DOMUtils.getById('galaxy-count'),
            fpsCounter: DOMUtils.getById('fps-counter'),
            paletteColors: DOMUtils.getById('palette-colors')
        };

        this.init();
    }

    async init() {
        try {
            // Initialize layers
            await this.initializeLayers();

            // Setup event listeners
            this.setupEventListeners();

            // Load saved palette
            this.loadPalette();

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

        // Layer 4: Color Cube Modal
        const cubeContainer = DOMUtils.getById('cube-container');
        this.colorCube = new ColorCube(cubeContainer, this.eventBus);

        // Update stats (只更新星系粒子数，因为我们移除了 particle-count 元素)
        DOMUtils.setText('galaxy-count', this.galaxyLayer.getParticleCount().toLocaleString());

        // Sample initial colors from galaxy
        this.sampleGalaxyColors();
    }

    startColorCubeGrowth() {
        // 生成一组示例颜色用于 Color Cube
        const sampleColors = this.generateSampleColors(500);
        
        // 显示背景 Color Cube 并开始生长动画
        this.colorCubeBackground.show(sampleColors);
        
        console.log('🎨 Color Cube growth started');
    }

    generateSampleColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            // 生成均匀分布的颜色
            const h = (i / count) * 360;
            const s = 50 + Math.random() * 50;
            const l = 30 + Math.random() * 40;
            
            const rgb = this.hslToRgb(h, s, l);
            colors.push({
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
                hex: this.rgbToHex(rgb.r, rgb.g, rgb.b),
                hsl: { h, s, l }
            });
        }
        return colors;
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

        // Click (triggers analyze mode)
        document.addEventListener('click', (e) => {
            // Ignore clicks on UI elements
            if (e.target.closest('.ui-overlay') || e.target.closest('.modal')) {
                return;
            }

            this.galaxyLayer.onClick(e.clientX, e.clientY);
        });

        // Galaxy click event
        this.eventBus.on('galaxy:click', (data) => {
            this.enterAnalyzeMode(data);
        });

        // Big Bang complete event - 等待粒子稳定后触发 Color Cube
        this.eventBus.on('galaxy:bigBangComplete', () => {
            console.log('🌌 Big Bang complete, waiting for particles to stabilize...');
            // 等待 3 秒让粒子完全稳定
            setTimeout(() => {
                console.log('✨ Particles stabilized, starting Color Cube growth...');
                this.startColorCubeGrowth();
            }, 3000);
        });

        // Modal close
        this.elements.closeModal?.addEventListener('click', () => {
            this.exitAnalyzeMode();
        });

        // Particle mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setParticleMode(mode);

                // Update active state
                document.querySelectorAll('.mode-btn').forEach(b => {
                    DOMUtils.removeClass(b, 'active');
                });
                DOMUtils.addClass(btn, 'active');
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.appState.mode === 'analyze') {
                this.exitAnalyzeMode();
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.appState.mode === 'analyze') {
                this.colorCube.onResize();
            }
        });
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

    enterAnalyzeMode(data) {
        this.appState.mode = 'analyze';
        this.appState.selectedColors = data.colors;

        // Update UI
        DOMUtils.setText('mode-display', 'ANALYZE');
        DOMUtils.addClass(this.elements.modeDisplay, 'analyze');
        DOMUtils.removeClass(this.elements.modal, 'hidden');

        // Show color cube with selected colors
        this.colorCube.show(data.colors);

        // Update color info panel
        this.updateColorInfo(data.colors);

        // Add to palette (first color)
        if (data.colors.length > 0) {
            this.addToPalette(data.colors[0]);
        }

        console.log(`Analyzed ${data.colors.length} colors at position (${data.x.toFixed(2)}, ${data.y.toFixed(2)})`);
    }

    exitAnalyzeMode() {
        this.appState.mode = 'explore';

        // Update UI
        DOMUtils.setText('mode-display', 'EXPLORE');
        DOMUtils.removeClass(this.elements.modeDisplay, 'analyze');
        DOMUtils.addClass(this.elements.modal, 'hidden');

        // Hide color cube
        this.colorCube.hide();
    }

    updateColorInfo(colors) {
        if (colors.length === 0) return;

        const colorValuesEl = DOMUtils.getById('color-values');
        const colorNameEl = DOMUtils.getById('color-name');

        if (!colorValuesEl || !colorNameEl) return;

        // Show info for the first color
        const color = colors[0];

        colorNameEl.textContent = `Color Analysis (${colors.length} colors sampled)`;

        colorValuesEl.innerHTML = `
            <div>
                <strong>HEX:</strong> ${color.hex}
            </div>
            <div>
                <strong>RGB:</strong> rgb(${color.r}, ${color.g}, ${color.b})
            </div>
            <div>
                <strong>HSL:</strong> hsl(${Math.round(color.hsl.h)}°, ${Math.round(color.hsl.s)}%, ${Math.round(color.hsl.l)}%)
            </div>
            <div style="background: ${color.hex}; height: 60px; border-radius: 5px; grid-column: 1 / -1; margin-top: 10px;"></div>
        `;
    }

    addToPalette(color) {
        // Check if color already exists
        const exists = this.appState.palette.some(c => c.hex === color.hex);
        if (exists) return;

        // Add to palette (max 8 colors)
        if (this.appState.palette.length >= 8) {
            this.appState.palette.shift();
        }
        this.appState.palette.push(color);

        // Update UI
        this.renderPalette();

        // Save to storage
        StorageUtils.savePalette(this.appState.palette);
    }

    renderPalette() {
        if (!this.elements.paletteColors) return;

        this.elements.paletteColors.innerHTML = this.appState.palette
            .map(color => `
                <div class="palette-color" 
                     style="background: ${color.hex}" 
                     data-hex="${color.hex}"
                     title="Click to copy: ${color.hex}">
                </div>
            `)
            .join('');

        // Add click event listeners to copy color
        this.elements.paletteColors.querySelectorAll('.palette-color').forEach(colorEl => {
            colorEl.addEventListener('click', () => {
                const hex = colorEl.dataset.hex;
                this.copyColorToClipboard(hex, colorEl);
            });
        });
    }

    copyColorToClipboard(hex, element) {
        // Copy to clipboard
        navigator.clipboard.writeText(hex).then(() => {
            // Show success feedback
            this.showCopyFeedback(element, hex);
        }).catch(err => {
            console.error('Failed to copy color:', err);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(hex, element);
        });
    }

    fallbackCopyToClipboard(hex, element) {
        // Fallback method for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = hex;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopyFeedback(element, hex);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }

    showCopyFeedback(element, hex) {
        // Create floating notification
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = `Copied: ${hex}`;
        notification.style.cssText = `
            position: fixed;
            left: ${element.getBoundingClientRect().left}px;
            top: ${element.getBoundingClientRect().top - 40}px;
            background: rgba(0, 243, 255, 0.9);
            color: #000;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            z-index: 10000;
            pointer-events: none;
            animation: copyFadeOut 1.5s ease-out forwards;
            box-shadow: 0 0 20px rgba(0, 243, 255, 0.5);
        `;
        
        document.body.appendChild(notification);

        // Add pulse effect to the color block
        element.style.transform = 'scale(1.2)';
        element.style.boxShadow = '0 0 30px rgba(0, 243, 255, 0.8)';
        
        setTimeout(() => {
            element.style.transform = '';
            element.style.boxShadow = '';
        }, 300);

        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 1500);
    }

    loadPalette() {
        this.appState.palette = StorageUtils.loadPalette();
        this.renderPalette();
    }

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
        this.colorCube.dispose();
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
