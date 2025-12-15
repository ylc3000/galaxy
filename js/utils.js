// ===== UTILITY FUNCTIONS =====

/**
 * Color conversion utilities
 */
export const ColorUtils = {
    /**
     * Convert RGB to HSL
     */
    rgbToHsl(r, g, b) {
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
    },

    /**
     * Convert HSL to RGB
     */
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
    },

    /**
     * Convert RGB to HEX
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    /**
     * Convert HEX to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    /**
     * Get random vibrant color in HSL
     */
    randomVibrantColor() {
        return {
            h: Math.random() * 360,
            s: 40 + Math.random() * 60,
            l: 20 + Math.random() * 60
        };
    }
};

/**
 * Math utilities
 */
export const MathUtils = {
    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Map value from one range to another
     */
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Random number between min and max
     */
    random(min, max) {
        return min + Math.random() * (max - min);
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

/**
 * Performance utilities
 */
export class PerformanceMonitor {
    constructor() {
        this.fps = 60;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsUpdateInterval = 500; // Update every 500ms
    }

    update() {
        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        if (elapsed >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        return this.fps;
    }

    getFPS() {
        return this.fps;
    }
}

/**
 * Event bus for inter-layer communication
 */
export class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }

    clear() {
        this.events = {};
    }
}

/**
 * DOM utilities
 */
export const DOMUtils = {
    /**
     * Get element by ID with error handling
     */
    getById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID "${id}" not found`);
        }
        return element;
    },

    /**
     * Set text content safely
     */
    setText(id, text) {
        const element = this.getById(id);
        if (element) {
            element.textContent = text;
        }
    },

    /**
     * Add class to element
     */
    addClass(element, className) {
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    },

    /**
     * Remove class from element
     */
    removeClass(element, className) {
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
        }
    },

    /**
     * Toggle class on element
     */
    toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }
};

/**
 * Animation utilities
 */
export class AnimationController {
    constructor() {
        this.animations = new Map();
    }

    /**
     * Animate a value over time
     */
    animate(key, from, to, duration, onUpdate, onComplete, easing = this.easeInOutCubic) {
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);
            const value = from + (to - from) * easedProgress;

            onUpdate(value);

            if (progress < 1) {
                this.animations.set(key, requestAnimationFrame(update));
            } else {
                this.animations.delete(key);
                if (onComplete) onComplete();
            }
        };

        // Cancel existing animation with same key
        this.cancel(key);
        
        this.animations.set(key, requestAnimationFrame(update));
    }

    /**
     * Cancel animation by key
     */
    cancel(key) {
        if (this.animations.has(key)) {
            cancelAnimationFrame(this.animations.get(key));
            this.animations.delete(key);
        }
    }

    /**
     * Cancel all animations
     */
    cancelAll() {
        this.animations.forEach(id => cancelAnimationFrame(id));
        this.animations.clear();
    }

    // Easing functions
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
}

/**
 * Local storage utilities
 */
export const StorageUtils = {
    /**
     * Save palette to local storage
     */
    savePalette(colors) {
        try {
            localStorage.setItem('cosmic-lab-palette', JSON.stringify(colors));
        } catch (e) {
            console.error('Failed to save palette:', e);
        }
    },

    /**
     * Load palette from local storage
     */
    loadPalette() {
        try {
            const data = localStorage.getItem('cosmic-lab-palette');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load palette:', e);
            return [];
        }
    },

    /**
     * Clear palette
     */
    clearPalette() {
        try {
            localStorage.removeItem('cosmic-lab-palette');
        } catch (e) {
            console.error('Failed to clear palette:', e);
        }
    }
};
