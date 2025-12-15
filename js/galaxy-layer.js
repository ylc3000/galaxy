// ===== GALAXY LAYER (3D Background) =====
// Based on galaxy.js with modular enhancements

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ColorUtils } from './utils.js';

export class GalaxyLayer {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;

        // Configuration
        this.config = {
            particleCount: 15000,
            particleSize: 0.15,
            bloomStrength: 1.5,
            bloomRadius: 0.4,
            bloomThreshold: 0,
            color1: new THREE.Color('#00f3ff'),
            color2: new THREE.Color('#bc13fe'),
            mouseInfluenceRadius: 3,
            mouseForce: 2
        };

        // State
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.particlesGeometry = null;
        this.particlesMaterial = null;
        this.particlesMesh = null;
        this.mouse = new THREE.Vector2();
        this.targetMouse = new THREE.Vector2();
        this.clock = new THREE.Clock();

        // Big Bang Animation State
        this.bigBangState = 'idle'; // idle, singularity, explosion, formation
        this.bigBangStartTime = 0;
        this.singularityMesh = null;

        this.init();
    }

    init() {
        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 25; // Start closer for full screen effect

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Post Processing (Bloom)
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        );
        bloomPass.threshold = this.config.bloomThreshold;
        bloomPass.strength = this.config.bloomStrength;
        bloomPass.radius = this.config.bloomRadius;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);

        // Create Singularity
        this.createSingularity();

        // Create Particles (Hidden initially)
        this.createParticles();

        // Event Listeners
        window.addEventListener('resize', () => this.onResize());
    }

    createSingularity() {
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.singularityMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.singularityMesh);
        this.bigBangState = 'singularity';
    }

    createParticles() {
        this.particlesGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        const originalPositions = []; // The final spiral positions
        const velocities = []; // Explosion velocities

        const color = new THREE.Color();

        // Big Bang Colors (Hot to Cold)
        const bangColors = [
            new THREE.Color('#FFFFFF'), // White
            new THREE.Color('#FFFF00'), // Yellow
            new THREE.Color('#FF4500'), // Orange Red
            new THREE.Color('#00BFFF'), // Deep Sky Blue
            new THREE.Color('#8A2BE2'), // Blue Violet
            new THREE.Color('#FF1493')  // Deep Pink
        ];

        for (let i = 0; i < this.config.particleCount; i++) {
            // 1. Calculate Final Spiral Position
            // Increased radius for full screen coverage
            const radius = Math.random() * 30 + Math.random() * 10;
            const spinAngle = radius * 0.5;
            const branchAngle = (i % 3) * ((Math.PI * 2) / 3);

            const finalX = Math.cos(branchAngle + spinAngle) * radius + (Math.random() - 0.5) * 2;
            const finalY = (Math.random() - 0.5) * 4;
            const finalZ = Math.sin(branchAngle + spinAngle) * radius + (Math.random() - 0.5) * 2;

            originalPositions.push(finalX, finalY, finalZ);

            // 2. Initial Position (Center)
            positions.push(0, 0, 0);

            // 3. Explosion Velocity
            // Random direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            // Speed variance: some fast, some slow
            const speed = Math.random() * 20 + 5;

            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.sin(phi) * Math.sin(theta) * speed;
            const vz = Math.cos(phi) * speed;

            velocities.push(vx, vy, vz);

            // 4. Initial Color (Random from Bang Palette)
            const initialColor = bangColors[Math.floor(Math.random() * bangColors.length)];
            colors.push(initialColor.r, initialColor.g, initialColor.b);

            sizes.push(Math.random() * 2);
        }

        this.particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.particlesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.particlesGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        this.particlesGeometry.setAttribute('originalPosition', new THREE.Float32BufferAttribute(originalPositions, 3));
        this.particlesGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

        // Points Material
        this.particlesMaterial = new THREE.PointsMaterial({
            size: this.config.particleSize,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true,
            depthWrite: false,
            opacity: 0, // Start invisible
            map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png')
        });

        this.particlesMesh = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
        this.scene.add(this.particlesMesh);
    }

    startBigBang() {
        this.bigBangStartTime = Date.now();
        this.bigBangState = 'explosion';

        // Hide singularity
        if (this.singularityMesh) {
            this.singularityMesh.visible = false;
        }

        // Trigger Flash (via DOM)
        const flash = document.getElementById('flash-overlay');
        if (flash) {
            flash.classList.add('active');
            setTimeout(() => {
                flash.classList.remove('active');
                flash.classList.add('fading');
            }, 100);
        }

        // Show particles
        this.particlesMaterial.opacity = 1;

        console.log('💥 Big Bang started!');
    }

    onMouseMove(x, y) {
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;

        // Original simple mapping from galaxy.js
        this.targetMouse.x = (x - windowHalfX) * 0.05;
        this.targetMouse.y = (y - windowHalfY) * 0.05;
    }

    onClick(x, y) {
        // Get click position in world space (matching original galaxy.js)
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;
        const clickX = (x - windowHalfX) * 0.05;
        const clickY = -(y - windowHalfY) * 0.05;

        // Sample colors in the clicked region
        const sampledColors = this.sampleColorsInRegion(clickX, clickY, 5);

        // Emit event for other layers
        this.eventBus.emit('galaxy:click', {
            x: clickX,
            y: clickY,
            colors: sampledColors,
            screenX: x,
            screenY: y
        });

        // Pulse effect
        this.config.bloomStrength = 5.0;
        setTimeout(() => { this.config.bloomStrength = 1.5; }, 300);

        // Shockwave effect
        const positions = this.particlesGeometry.attributes.position.array;
        const count = this.particlesGeometry.attributes.position.count;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const dx = positions[i3] - clickX;
            const dy = positions[i3 + 1] - clickY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                const force = (10 - dist) / 10;
                const angle = Math.atan2(dy, dx);

                positions[i3] += Math.cos(angle) * force * 5;
                positions[i3 + 1] += Math.sin(angle) * force * 5;
            }
        }

        this.particlesGeometry.attributes.position.needsUpdate = true;
    }

    sampleColorsInRegion(x, y, radius) {
        const positions = this.particlesGeometry.attributes.position.array;
        const colors = this.particlesGeometry.attributes.color.array;
        const sampledColors = [];

        for (let i = 0; i < positions.length / 3; i++) {
            const i3 = i * 3;
            const px = positions[i3];
            const py = positions[i3 + 1];
            const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);

            if (dist < radius) {
                const r = Math.round(colors[i3] * 255);
                const g = Math.round(colors[i3 + 1] * 255);
                const b = Math.round(colors[i3 + 2] * 255);

                sampledColors.push({
                    r, g, b,
                    hex: ColorUtils.rgbToHex(r, g, b),
                    hsl: ColorUtils.rgbToHsl(r, g, b)
                });
            }
        }

        return sampledColors.slice(0, 50); // Limit to 50 colors
    }

    animate() {
        // if (!this.isAnimating) return; // Removed isAnimating check to simplify

        const time = this.clock.getElapsedTime();

        // 1. Singularity Phase
        if (this.bigBangState === 'singularity') {
            if (this.singularityMesh) {
                const pulse = 1 + Math.sin(time * 10) * 0.2;
                this.singularityMesh.scale.set(pulse, pulse, pulse);
            }
            this.composer.render();
            return;
        }

        // 2. Explosion Phase
        if (this.bigBangState === 'explosion') {
            const elapsed = (Date.now() - this.bigBangStartTime) / 1000; // seconds

            const positions = this.particlesGeometry.attributes.position.array;
            const velocities = this.particlesGeometry.attributes.velocity.array;
            const originalPositions = this.particlesGeometry.attributes.originalPosition.array;
            const colors = this.particlesGeometry.attributes.color.array;
            const count = this.particlesGeometry.attributes.position.count;

            // Transition from Explosion to Formation
            // 0-2s: Explosion
            // 2-6s: Formation (Lerp to spiral)

            let formationProgress = 0;
            if (elapsed > 2.0) {
                formationProgress = Math.min((elapsed - 2.0) / 4.0, 1);
                // Ease out
                formationProgress = 1 - Math.pow(1 - formationProgress, 3);
            }

            // Target Colors (Galaxy Gradient)
            const color1 = this.config.color1; // Cyan
            const color2 = this.config.color2; // Purple
            const tempColor = new THREE.Color();

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;

                if (formationProgress < 1) {
                    // Physics Update
                    // x = x + v * dt (simplified)
                    // We calculate position based on time to keep it deterministic-ish

                    // Explosion Position
                    const ex = velocities[i3] * elapsed * (1 - elapsed * 0.1); // Slow down slightly
                    const ey = velocities[i3 + 1] * elapsed * (1 - elapsed * 0.1);
                    const ez = velocities[i3 + 2] * elapsed * (1 - elapsed * 0.1);

                    // Target Spiral Position
                    const tx = originalPositions[i3];
                    const ty = originalPositions[i3 + 1];
                    const tz = originalPositions[i3 + 2];

                    // Lerp based on formation progress
                    if (formationProgress > 0) {
                        positions[i3] = THREE.MathUtils.lerp(ex, tx, formationProgress);
                        positions[i3 + 1] = THREE.MathUtils.lerp(ey, ty, formationProgress);
                        positions[i3 + 2] = THREE.MathUtils.lerp(ez, tz, formationProgress);

                        // Color Transition
                        // Calculate target color based on radius
                        const radius = Math.sqrt(tx * tx + ty * ty + tz * tz);
                        const mixedColor = tempColor.copy(color2).lerp(color1, radius / 20);

                        // Lerp current color to target color
                        colors[i3] = THREE.MathUtils.lerp(colors[i3], mixedColor.r, 0.05);
                        colors[i3 + 1] = THREE.MathUtils.lerp(colors[i3 + 1], mixedColor.g, 0.05);
                        colors[i3 + 2] = THREE.MathUtils.lerp(colors[i3 + 2], mixedColor.b, 0.05);

                    } else {
                        positions[i3] = ex;
                        positions[i3 + 1] = ey;
                        positions[i3 + 2] = ez;
                    }
                } else {
                    // Animation Complete - Switch to Idle
                    this.bigBangState = 'complete';
                }
            }

            this.particlesGeometry.attributes.position.needsUpdate = true;
            this.particlesGeometry.attributes.color.needsUpdate = true;

            // Camera Zoom
            // Start at 10 (close to singularity), zoom out to 25 (full screen), then settle
            if (elapsed < 6.0) {
                this.camera.position.z = THREE.MathUtils.lerp(5, 25, elapsed / 6.0);
            }

            if (this.bigBangState === 'complete') {
                console.log('🌌 Galaxy Formation Complete');
                // 通知 app-controller Big Bang 已完成
                this.eventBus.emit('galaxy:bigBangComplete');
            }

            this.composer.render();
            return;
        }

        // 3. Normal Animation (Complete)

        // Smooth mouse movement
        this.mouse.lerp(this.targetMouse, 0.1);

        // Rotate galaxy
        this.particlesMesh.rotation.y += 0.001;
        this.particlesMesh.rotation.z += 0.0005;

        // Update particle positions
        const positions = this.particlesGeometry.attributes.position.array;
        const originalPositions = this.particlesGeometry.attributes.originalPosition.array;
        const count = this.particlesGeometry.attributes.position.count;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const ox = originalPositions[i3];
            const oy = originalPositions[i3 + 1];
            const oz = originalPositions[i3 + 2];

            // Sine wave floating
            positions[i3 + 1] = oy + Math.sin(time + ox) * 0.5;

            // Mouse interaction
            const dx = positions[i3] - this.mouse.x;
            const dy = positions[i3 + 1] - (-this.mouse.y);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.config.mouseInfluenceRadius) {
                const force = (this.config.mouseInfluenceRadius - dist) / this.config.mouseInfluenceRadius;
                const angle = Math.atan2(dy, dx);

                positions[i3] += Math.cos(angle) * force * this.config.mouseForce;
                positions[i3 + 1] += Math.sin(angle) * force * this.config.mouseForce;
            } else {
                positions[i3] += (ox - positions[i3]) * 0.05;
            }
        }

        this.particlesGeometry.attributes.position.needsUpdate = true;

        // Pulse bloom
        this.composer.passes[1].strength = THREE.MathUtils.lerp(
            this.composer.passes[1].strength,
            this.config.bloomStrength,
            0.1
        );

        this.composer.render();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    getParticleCount() {
        return this.config.particleCount;
    }

    dispose() {
        // this.isAnimating = false;
        if (this.particlesGeometry) this.particlesGeometry.dispose();
        if (this.particlesMaterial) this.particlesMaterial.dispose();
        if (this.renderer) this.renderer.dispose();
    }
}
