// ===== COLOR CUBE (3D Background) =====
// Based on 1.html - 3D color space visualization with real color data

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ColorUtils } from "./utils.js";

export class ColorCube {
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;

    // Configuration
    this.config = {
      cubeSize: 100,
      particleSize: 2.5,
      growthDuration: 4000, // 生长动画时长（毫秒）- 4 秒更平滑
      repulsionRadius: 400, // 排斥半径（增大到 400）
      repulsionForce: 2.0, // 排斥力度（增大到 2.0）
    };

    // State
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.particles = null;
    this.geometry = null;
    this.material = null;
    this.wireframeCube = null;
    this.colorsData = [];
    this.currentModel = "rgb";
    this.isActive = false;
    this.animationId = null;

    // Growth animation state
    this.growthProgress = 0; // 0-1
    this.growthStartTime = 0;
    this.isGrowing = false;
    this.currentScale = 0; // 当前缩放比例

    // Color models configuration (完全来自 1.html)
    this.models = {
      rgb: { func: "rgb", x: [0, 255], y: [1, 255], z: [2, 255] },
      hsl: { func: "hsl", x: [0, 360], y: [1, 1], z: [2, 1] },
      hsv: { func: "hsv", x: [0, 360], y: [1, 1], z: [2, 1] },
      lab: {
        func: "lab",
        z: [0, 100],
        y: [1, 128, -128],
        x: [2, 128, -128],
      },
      lch: { func: "lch", z: [0, 100], y: [1, 100], x: [2, 0, 360] },
    };

    this.init();
  }

  init() {
    // Scene & Camera (完全来自 1.html)
    this.scene = new THREE.Scene();
    this.scene.background = null; // 透明背景
    this.scene.fog = new THREE.Fog(0x000000, 150, 350);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(180, 100, 180);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // Controls (完全来自 1.html)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;

    // Raycaster for color picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.raycaster.params.Points.threshold = 2;

    // Tooltip
    this.tooltip = this.createTooltip();

    // Cube Frame
    this.createCubeFrame();

    // Load color data from API (like 1.html)
    this.fetchColors("default");

    // Event listeners
    window.addEventListener("resize", () => this.onResize());
    this.renderer.domElement.addEventListener("mousemove", (e) =>
      this.onMouseMove(e)
    );
    this.renderer.domElement.addEventListener("mouseleave", () => {
      this.controls.autoRotate = true; // 鼠标离开画布，恢复自动旋转
      this.hideTooltip();
    });
  }

  createTooltip() {
    const tooltip = document.createElement("div");
    tooltip.className = "color-tooltip";
    tooltip.style.cssText = `
      position: fixed;
      pointer-events: none;
      background: rgba(0, 0, 0, 0.9);
      padding: 12px 16px;
      border-radius: 8px;
      display: none;
      z-index: 1000;
      border: 2px solid #00f3ff;
      box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
      font-family: 'Orbitron', sans-serif;
    `;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  onMouseMove(event) {
    if (!this.particles || !this.isActive) return;

    // 计算鼠标位置
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycasting
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.particles);

    if (intersects.length > 0) {
      // 鼠标悬停在立方体上 - 停止自动旋转
      this.controls.autoRotate = false;
      
      const index = intersects[0].index;
      const colorData = this.colorsData[index];
      if (colorData) {
        this.showTooltip(colorData, event.clientX, event.clientY);
        document.body.style.cursor = "pointer";
      }
    } else {
      // 鼠标不在立方体上 - 恢复自动旋转
      this.controls.autoRotate = true;
      this.hideTooltip();
      document.body.style.cursor = "default";
    }
  }

  showTooltip(colorData, x, y) {
    this.tooltip.style.display = "block";
    this.tooltip.style.left = x + 15 + "px";
    this.tooltip.style.top = y + 15 + "px";
    this.tooltip.style.borderColor = colorData.hex;

    this.tooltip.innerHTML = `
      <div style="color: #00f3ff; font-size: 14px; font-weight: 700; margin-bottom: 6px;">
        ${colorData.name}
      </div>
      <div style="color: #fff; font-size: 12px; font-family: 'Courier New', monospace;">
        ${colorData.hex}
      </div>
      <div style="background: ${colorData.hex}; height: 30px; border-radius: 4px; margin-top: 8px;"></div>
    `;
  }

  hideTooltip() {
    this.tooltip.style.display = "none";
  }

  // 从 API 获取颜色数据（完全来自 1.html）
  fetchColors(listName) {
    fetch(`https://api.color.pizza/v1/?list=${listName}`)
      .then((r) => r.json())
      .then((data) => {
        this.colorsData = data.colors;
        console.log(
          `🎨 Loaded ${this.colorsData.length} colors from API (${listName})`
        );
        // 不立即显示，等待 show() 调用
      })
      .catch((err) => console.error("Failed to load colors", err));
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
    // 如果传入了颜色数据，使用它；否则使用从 API 加载的数据
    if (colors && colors.length > 0) {
      this.colorsData = colors;
    }

    if (this.colorsData.length === 0) {
      console.warn("No color data available");
      return;
    }

    this.updateParticles();

    // 开始生长动画
    this.startGrowthAnimation();

    // 通知粒子层开始排斥
    this.eventBus.emit("colorCube:growing", {
      radius: this.config.repulsionRadius,
      force: this.config.repulsionForce,
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

  // 更新粒子（完全来自 1.html 的逻辑）
  updateParticles() {
    if (this.particles) {
      this.scene.remove(this.particles);
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
    }

    // 使用 THREE.Geometry (1.html 使用的旧版 API)
    this.geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const conf = this.models[this.currentModel];
    const half = this.config.cubeSize / 2;

    this.colorsData.forEach((c) => {
      const hex = c.hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      // 转换颜色空间（简化版，使用 HSL 近似）
      const hsl = ColorUtils.rgbToHsl(r, g, b);
      let components;

      if (this.currentModel === "rgb") {
        components = [r, g, b];
      } else if (this.currentModel === "hsl") {
        components = [hsl.h, hsl.s / 100, hsl.l / 100];
      } else if (this.currentModel === "hsv") {
        components = [hsl.h, hsl.s / 100, hsl.l / 100];
      } else if (this.currentModel === "lab") {
        // LAB 简化映射
        components = [hsl.l, hsl.s - 50, hsl.h / 360 * 100 - 50];
      } else if (this.currentModel === "lch") {
        components = [hsl.l, hsl.s, hsl.h];
      } else {
        components = [r, g, b];
      }

      // 计算位置
      const xIdx = conf.x[0];
      const yIdx = conf.y[0];
      const zIdx = conf.z[0];

      let px = this.translate(
        components[xIdx],
        conf.x[2] || 0,
        conf.x[1],
        -half,
        half
      );
      let py = this.translate(
        components[yIdx],
        conf.y[2] || 0,
        conf.y[1],
        -half,
        half
      );
      let pz = this.translate(
        components[zIdx],
        conf.z[2] || 0,
        conf.z[1],
        -half,
        half
      );

      // 圆柱坐标系（HSL/HSV/LCH）
      if (["hsl", "hsv", "lch"].includes(this.currentModel)) {
        const angle = (components[xIdx] * Math.PI) / 180;
        const radVal = components[yIdx];
        const radius = this.translate(
          radVal,
          conf.y[2] || 0,
          conf.y[1],
          0,
          half
        );

        px = Math.sin(angle) * radius;
        pz = Math.cos(angle) * radius;
        // Y 保持为亮度
      }

      positions.push(px, py, pz);
      colors.push(r / 255, g / 255, b / 255);
    });

    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    // Material (完全来自 1.html)
    this.material = new THREE.PointsMaterial({
      size: this.config.particleSize,
      vertexColors: true,
      map: this.createDotTexture(),
      alphaTest: 0.5,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.particles.name = "particles";
    this.scene.add(this.particles);
  }

  // 辅助函数：映射数值范围（来自 1.html）
  translate(val, minIn, maxIn, minOut, maxOut) {
    return minOut + ((maxOut - minOut) * (val - minIn)) / (maxIn - minIn);
  }

  setModel(model) {
    this.currentModel = model;
    if (this.isActive && this.colorsData.length > 0) {
      this.updateParticles();
    }
  }

    createDotTexture() {
        // 创建圆形纹理，让粒子看起来更圆润（与 1.html 相同）
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.beginPath();
        ctx.arc(16, 16, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
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
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        this.hide();
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}

// Import MathUtils for map function
const MathUtils = {
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }
};
