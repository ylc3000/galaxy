import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Configuration
const CONFIG = {
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
let scene, camera, renderer, composer;
let particlesGeometry, particlesMaterial, particlesMesh;
let mouse = new THREE.Vector2();
let targetMouse = new THREE.Vector2();
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let clock = new THREE.Clock();

// DOM Elements
const container = document.getElementById('canvas-container');
const particleCountEl = document.getElementById('particle-count');
const fpsEl = document.getElementById('fps-counter');

// Initialize
init();
animate();

function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.02);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    // Post Processing (Bloom)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = CONFIG.bloomThreshold;
    bloomPass.strength = CONFIG.bloomStrength;
    bloomPass.radius = CONFIG.bloomRadius;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Create Particles
    createParticles();

    // Event Listeners
    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('click', onDocumentClick);
    window.addEventListener('resize', onWindowResize);

    // Update Stats
    particleCountEl.textContent = CONFIG.particleCount.toLocaleString();
}

function createParticles() {
    particlesGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const originalPositions = []; // Store original positions for "memory" effect

    const color = new THREE.Color();

    for (let i = 0; i < CONFIG.particleCount; i++) {
        // Spiral Galaxy Distribution
        const i3 = i * 3;
        const radius = Math.random() * 20 + Math.random() * 5;
        const spinAngle = radius * 0.5;
        const branchAngle = (i % 3) * ((Math.PI * 2) / 3);

        const x = Math.cos(branchAngle + spinAngle) * radius + (Math.random() - 0.5) * 2;
        const y = (Math.random() - 0.5) * 4; // Flatter disk
        const z = Math.sin(branchAngle + spinAngle) * radius + (Math.random() - 0.5) * 2;

        positions.push(x, y, z);
        originalPositions.push(x, y, z);

        // Color Gradient based on radius
        const mixedColor = color.copy(CONFIG.color2).lerp(CONFIG.color1, radius / 20);
        colors.push(mixedColor.r, mixedColor.g, mixedColor.b);

        sizes.push(Math.random() * 2);
    }

    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    particlesGeometry.setAttribute('originalPosition', new THREE.Float32BufferAttribute(originalPositions, 3));

    // Shader Material for custom particle behavior
    const vertexShader = `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
            // Circular particle
            vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
            if (dot(circCoord, circCoord) > 1.0) {
                discard;
            }
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;

    particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pointTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png') }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
    });

    particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
}

function onDocumentMouseMove(event) {
    // Normalize mouse coordinates
    targetMouse.x = (event.clientX - windowHalfX) * 0.05; // Scale down for world space
    targetMouse.y = (event.clientY - windowHalfY) * 0.05;
}

function onDocumentClick() {
    // Pulse effect: Randomize some velocities or colors temporarily
    CONFIG.bloomStrength = 3.0;
    setTimeout(() => { CONFIG.bloomStrength = 1.5; }, 200);
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Smooth mouse movement
    mouse.lerp(targetMouse, 0.1);

    // Rotate entire galaxy slowly
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.z += 0.0005;

    // Update particle positions (Wave effect + Mouse Interaction)
    const positions = particlesGeometry.attributes.position.array;
    const originalPositions = particlesGeometry.attributes.originalPosition.array;
    const count = particlesGeometry.attributes.position.count;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // 1. Base Movement: Gentle floating based on original position
        const ox = originalPositions[i3];
        const oy = originalPositions[i3 + 1];
        const oz = originalPositions[i3 + 2];

        // Sine wave floating
        positions[i3 + 1] = oy + Math.sin(time + ox) * 0.5;

        // 2. Mouse Interaction (Repulsion)
        // Convert particle world position to screen-ish space logic for simple interaction
        // Here we just use the mouse vector as a "force field" in world space (z=0 plane)

        const dx = positions[i3] - mouse.x;
        const dy = positions[i3 + 1] - (-mouse.y); // Invert Y for 3D space
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.mouseInfluenceRadius) {
            const force = (CONFIG.mouseInfluenceRadius - dist) / CONFIG.mouseInfluenceRadius;
            const angle = Math.atan2(dy, dx);

            positions[i3] += Math.cos(angle) * force * CONFIG.mouseForce;
            positions[i3 + 1] += Math.sin(angle) * force * CONFIG.mouseForce;
        } else {
            // Return to original(ish) X/Z
            positions[i3] += (ox - positions[i3]) * 0.05;
            // Y is handled by sine wave above
        }
    }

    particlesGeometry.attributes.position.needsUpdate = true;

    // Pulse bloom
    composer.passes[1].strength = THREE.MathUtils.lerp(composer.passes[1].strength, CONFIG.bloomStrength, 0.1);

    // Update FPS (rough estimate)
    if (Math.random() > 0.95) {
        fpsEl.textContent = Math.round(1 / (clock.getDelta() || 0.016));
    }

    composer.render();
}
