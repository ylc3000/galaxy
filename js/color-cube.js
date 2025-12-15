// ===== COLOR CUBE (3D Modal) =====
// Based on 1.html - 3D color space visualization

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColorUtils } from './utils.js';

export class ColorCube {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;

        // Configuration
        this.config = {
            cubeSize: 100,
            particleSize: 2.5,
            growthDuration: 4000,      // 生长动画时长（毫秒）- 4 秒更平滑
            repulsionRadius: 400,      // 排斥半径（增大到 400）
            repulsionForce: 2.0        // 排斥力度（增大到 2.0）
        };

        // State
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.particles = null;
        this.wireframeCube = null;
        this.colorsData = [];
        this.currentModel = 'rgb';
        this.isActive = false;
        this.animationId = null;

        // Growth animation state
        this.growthProgress = 0;       // 0-1
        this.growthStartTime = 0;
        this.isGrowing = false;
        this.currentScale = 0;         // 当前缩放比例

        this.init();
    }

    init() {
        // Scene & Camera
        this.scene = new THREE.Scene();
        // 背景透明（用于背景模式）
        this.scene.background = null;
        this.scene.fog = new THREE.Fog(0x000000, 150, 350);

        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            1,
            1000
        );
        this.camera.position.set(180, 100, 180);

        // Renderer with alpha for transparency
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0); // 完全透明
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1.0;

        // Cube Frame
        this.createCubeFrame();

        window.addEventListener('resize', () => this.onResize());
    }

    createCubeFrame() {
        if (this.wireframeCube) this.scene.remove(this.wireframeCube);

        const geometry = new THREE.BoxGeometry(
            this.config.cubeSize,
            this.config.cubeSize,
            this.config.cubeSize
        );
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.3,
            transparent: true
        });

        this.wireframeCube = new THREE.LineSegments(edges, material);
        this.scene.add(this.wireframeCube);
    }

    show(colors) {
        this.isActive = true;
        this.colorsData = colors;
        this.updateParticles();
        
        // 开始生长动画
        this.startGrowthAnimation();
        
        // 通知粒子层开始排斥
        this.eventBus.emit('colorCube:growing', {
            radius: this.config.repulsionRadius,
            force: this.config.repulsionForce
        });
        
        this.animate();
    }

    startGrowthAnimation() {
        this.isGrowing = true;
        this.growthProgress = 0;
        this.currentScale = 0;
        this.growthStartTime = Date.now();
        
        // 初始状态：立方体和粒子都缩放到 0
        if (this.wireframeCube) {
            this.wireframeCube.scale.set(0, 0, 0);
        }
        if (this.particles) {
            this.particles.scale.set(0, 0, 0);
        }
    }

    hide() {
        this.isActive = false;
        this.isGrowing = false;
        
        // 通知粒子层停止排斥
        this.eventBus.emit('colorCube:hidden');
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    setModel(model) {
        this.currentModel = model;
        if (this.isActive) {
            this.updateParticles();
        }
    }

    updateParticles() {
        // Remove existing particles
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const half = this.config.cubeSize / 2;

        this.colorsData.forEach(colorData => {
            const { r, g, b } = colorData;

            // For simplicity, we'll use RGB model
            // You can extend this to support other models
            let px, py, pz;

            if (this.currentModel === 'rgb') {
                px = MathUtils.map(r, 0, 255, -half, half);
                py = MathUtils.map(g, 0, 255, -half, half);
                pz = MathUtils.map(b, 0, 255, -half, half);
            } else if (this.currentModel === 'hsl') {
                const hsl = ColorUtils.rgbToHsl(r, g, b);
                const angle = (hsl.h * Math.PI) / 180;
                const radius = (hsl.s / 100) * half;
                px = Math.sin(angle) * radius;
                pz = Math.cos(angle) * radius;
                py = MathUtils.map(hsl.l, 0, 100, -half, half);
            } else {
                // Default to RGB
                px = MathUtils.map(r, 0, 255, -half, half);
                py = MathUtils.map(g, 0, 255, -half, half);
                pz = MathUtils.map(b, 0, 255, -half, half);
            }

            positions.push(px, py, pz);
            colors.push(r / 255, g / 255, b / 255);
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: this.config.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    animate() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());
        
        // 更新生长动画
        if (this.isGrowing) {
            this.updateGrowthAnimation();
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    updateGrowthAnimation() {
        const elapsed = Date.now() - this.growthStartTime;
        this.growthProgress = Math.min(elapsed / this.config.growthDuration, 1);
        
        // 使用缓动函数（ease-in-out-quart）- 更平滑的生长曲线
        // 缓慢启动 → 中间加速 → 缓慢结束
        let eased;
        if (this.growthProgress < 0.5) {
            eased = 8 * Math.pow(this.growthProgress, 4);
        } else {
            eased = 1 - Math.pow(-2 * this.growthProgress + 2, 4) / 2;
        }
        this.currentScale = eased;
        
        // 更新立方体和粒子的缩放
        if (this.wireframeCube) {
            this.wireframeCube.scale.set(eased, eased, eased);
        }
        if (this.particles) {
            this.particles.scale.set(eased, eased, eased);
        }
        
        // 通知粒子层当前的排斥强度
        this.eventBus.emit('colorCube:growthUpdate', {
            progress: this.growthProgress,
            scale: this.currentScale,
            radius: this.config.repulsionRadius * eased
        });
        
        // 动画完成
        if (this.growthProgress >= 1) {
            this.isGrowing = false;
            this.eventBus.emit('colorCube:growthComplete');
            console.log('🎨 Color Cube growth complete');
        }
    }

    onResize() {
        if (!this.container.clientWidth || !this.container.clientHeight) return;

        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    dispose() {
        this.hide();
        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Import MathUtils for map function
const MathUtils = {
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }
};
