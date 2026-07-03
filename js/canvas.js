/**
 * NexusFlow Canvas Rendering Engine
 * ==================================
 * Handles all canvas-based visual effects for the NexusFlow form builder:
 *   - PCB circuit background with animated electric pulses
 *   - Particle systems for shockwave, error, and submission effects
 *   - Optimized render loop with delta-time and visibility handling
 *
 * @module canvas
 */

// ─── Color Constants ────────────────────────────────────────────────────────────
const COLORS = {
  CYAN:       '#00F0FF',
  CYAN_RGB:   [0, 240, 255],
  PURPLE:     '#8A2BE2',
  PURPLE_RGB: [138, 43, 226],
  FLUID:      '#00A3FF',
  FLUID_RGB:  [0, 163, 255],
  BASE:       '#080B10',
  ERROR:      '#FF2D55',
  ERROR_RGB:  [255, 45, 85],
};

// ─── Easing & Utility Functions ─────────────────────────────────────────────────

/** @param {number} t - Progress 0-1 @returns {number} */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/** @param {number} t - Progress 0-1 @returns {number} */
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

/** @param {number} t - Progress 0-1 @returns {number} */
function easeInCubic(t) { return t * t * t; }

/** @param {number} a @param {number} b @param {number} t @returns {number} */
function lerp(a, b, t) { return a + (b - a) * t; }

/** @param {number} min @param {number} max @returns {number} */
function randomRange(min, max) { return Math.random() * (max - min) + min; }

/** @param {number} min @param {number} max @returns {number} inclusive */
function randomInt(min, max) { return Math.floor(randomRange(min, max + 1)); }

/**
 * Clamp a value between min and max.
 * @param {number} v @param {number} lo @param {number} hi @returns {number}
 */
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ─── Particle ───────────────────────────────────────────────────────────────────

/**
 * Individual particle used across all effect types.
 */
class Particle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} vx - velocity x (px/s)
   * @param {number} vy - velocity y (px/s)
   * @param {number} radius
   * @param {number[]} rgb - [r, g, b]
   * @param {number} life - total lifetime in seconds
   * @param {number} [glow=0] - shadow blur radius for glow effect
   */
  constructor(x, y, vx, vy, radius, rgb, life, glow = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.rgb = rgb;
    this.life = life;
    this.maxLife = life;
    this.glow = glow;
    this.alive = true;
  }

  /** @param {number} dt - delta time in seconds */
  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (!this.alive) return;
    const alpha = clamp(this.life / this.maxLife, 0, 1);
    const [r, g, b] = this.rgb;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.3 + 0.7 * alpha), 0, Math.PI * 2);
    if (this.glow > 0) {
      ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
      ctx.shadowBlur = this.glow * alpha;
    }
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
    if (this.glow > 0) {
      ctx.shadowBlur = 0;
    }
  }

  /** @returns {boolean} */
  get isDead() { return !this.alive; }
}

// ─── Particle System ────────────────────────────────────────────────────────────

const MAX_PARTICLES = 500;

/**
 * Manages pools of particles for all effect types.
 */
class ParticleSystem {
  constructor() {
    /** @type {Particle[]} */
    this.particles = [];
  }

  /**
   * Emit particles from configuration.
   * @param {Object} config
   * @param {number} config.x
   * @param {number} config.y
   * @param {number} config.count
   * @param {number[]} config.rgb
   * @param {number} [config.radiusMin=1]
   * @param {number} [config.radiusMax=3]
   * @param {number} [config.speedMin=30]
   * @param {number} [config.speedMax=150]
   * @param {number} [config.lifeMin=0.3]
   * @param {number} [config.lifeMax=0.8]
   * @param {number} [config.glow=0]
   * @param {number} [config.angleMin=0]
   * @param {number} [config.angleMax=Math.PI*2]
   * @param {Function} [config.customInit] - (particle, index) => void for custom setup
   */
  emit(config) {
    const count = Math.min(config.count, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < count; i++) {
      const angle = randomRange(config.angleMin ?? 0, config.angleMax ?? Math.PI * 2);
      const speed = randomRange(config.speedMin ?? 30, config.speedMax ?? 150);
      const p = new Particle(
        config.x,
        config.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomRange(config.radiusMin ?? 1, config.radiusMax ?? 3),
        config.rgb,
        randomRange(config.lifeMin ?? 0.3, config.lifeMax ?? 0.8),
        config.glow ?? 0
      );
      if (config.customInit) config.customInit(p, i);
      this.particles.push(p);
    }
  }

  /**
   * Directly add a particle.
   * @param {Particle} p
   */
  add(p) {
    if (this.particles.length < MAX_PARTICLES) {
      this.particles.push(p);
    }
  }

  /** @param {number} dt */
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].isDead) {
        // Swap-remove for perf
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  get count() { return this.particles.length; }
}

// ─── Shockwave Ring ─────────────────────────────────────────────────────────────

/**
 * Expanding radial ring effect triggered on component drop.
 */
class Shockwave {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} maxRadius
   * @param {number} duration - seconds
   * @param {number[]} rgb
   */
  constructor(x, y, maxRadius = 200, duration = 0.6, rgb = COLORS.CYAN_RGB) {
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.rgb = rgb;
    this.elapsed = 0;
    this.alive = true;
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.alive) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) this.alive = false;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (!this.alive) return;
    const t = clamp(this.elapsed / this.duration, 0, 1);
    const eased = easeOutCubic(t);
    const radius = eased * this.maxRadius;
    const alpha = 1 - eased;
    const [r, g, b] = this.rgb;

    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.8})`;
    ctx.lineWidth = lerp(3, 0.5, eased);
    ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
    ctx.shadowBlur = 20 * alpha;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner softer ring
    if (radius > 10) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  get isDead() { return !this.alive; }
}

// ─── Lightning Effect ───────────────────────────────────────────────────────────

/**
 * Jagged lightning bolt for error flash effects.
 */
class LightningBolt {
  /**
   * @param {number} x - origin x
   * @param {number} y - origin y
   * @param {number[]} rgb
   */
  constructor(x, y, rgb = COLORS.ERROR_RGB) {
    this.x = x;
    this.y = y;
    this.rgb = rgb;
    this.elapsed = 0;
    this.alive = true;
    this.totalDuration = 0.5; // total seconds: flash on 100ms, off 50ms, on 80ms, fade 270ms
    this.segments = this._generateBolts();
  }

  /**
   * Generate 3-4 branching lightning paths.
   * @returns {Array<Array<{x:number, y:number}>>}
   */
  _generateBolts() {
    const bolts = [];
    const count = randomInt(3, 4);
    for (let b = 0; b < count; b++) {
      const angle = randomRange(0, Math.PI * 2);
      const length = randomRange(40, 100);
      const steps = randomInt(4, 7);
      const points = [{ x: this.x, y: this.y }];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const px = this.x + Math.cos(angle) * length * t + randomRange(-15, 15);
        const py = this.y + Math.sin(angle) * length * t + randomRange(-15, 15);
        points.push({ x: px, y: py });
      }
      bolts.push(points);
    }
    return bolts;
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.alive) return;
    this.elapsed += dt;
    if (this.elapsed >= this.totalDuration) this.alive = false;
  }

  /**
   * Determine visibility based on flash pattern.
   * @returns {number} alpha 0-1
   */
  _getAlpha() {
    const e = this.elapsed * 1000; // ms
    if (e < 100) return 1.0;              // on
    if (e < 150) return 0.0;              // off
    if (e < 230) return 0.9;              // on
    // fade out
    const fadeT = (e - 230) / 270;
    return clamp(1 - fadeT, 0, 1);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (!this.alive) return;
    const alpha = this._getAlpha();
    if (alpha <= 0) return;
    const [r, g, b] = this.rgb;

    ctx.save();
    ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
    ctx.shadowBlur = 15 * alpha;
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const bolt of this.segments) {
      ctx.beginPath();
      ctx.moveTo(bolt[0].x, bolt[0].y);
      for (let i = 1; i < bolt.length; i++) {
        ctx.lineTo(bolt[i].x, bolt[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  get isDead() { return !this.alive; }
}

// ─── Submission Cascade ─────────────────────────────────────────────────────────

/**
 * Manages the staged particle cascade from form blocks to the data sink.
 */
class SubmissionCascade {
  /**
   * @param {Array<{x:number,y:number,width:number,height:number}>} sourceRects
   * @param {{x:number,y:number,width:number,height:number}} sinkRect
   * @param {ParticleSystem} particleSystem
   */
  constructor(sourceRects, sinkRect, particleSystem) {
    this.sourceRects = sourceRects;
    this.sinkRect = sinkRect;
    this.ps = particleSystem;
    this.elapsed = 0;
    this.alive = true;
    this.emitted = new Set();
    this.staggerDelay = 0.1; // 100ms between each source
    this.totalDuration = 2.0;
    this.sinkCenterX = sinkRect.x + sinkRect.width / 2;
    this.sinkCenterY = sinkRect.y + sinkRect.height / 2;
    /** @type {Array<{x:number,y:number,timer:number}>} */
    this.sinkFlashes = [];
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.alive) return;
    this.elapsed += dt;

    // Emit particles for each source in staggered fashion
    for (let i = 0; i < this.sourceRects.length; i++) {
      const triggerTime = i * this.staggerDelay;
      if (this.elapsed >= triggerTime && !this.emitted.has(i)) {
        this.emitted.add(i);
        this._emitFromSource(this.sourceRects[i]);
      }
    }

    // Update sink flashes
    for (let i = this.sinkFlashes.length - 1; i >= 0; i--) {
      this.sinkFlashes[i].timer -= dt;
      if (this.sinkFlashes[i].timer <= 0) {
        this.sinkFlashes.splice(i, 1);
      }
    }

    if (this.elapsed >= this.totalDuration) this.alive = false;
  }

  /**
   * Emit particles from a source rect flowing toward sink.
   * @param {{x:number,y:number,width:number,height:number}} rect
   */
  _emitFromSource(rect) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const count = randomInt(20, 30);
    const sinkX = this.sinkCenterX;
    const sinkY = this.sinkCenterY;
    const cascadeRef = this;

    this.ps.emit({
      x: cx,
      y: cy,
      count,
      rgb: Math.random() > 0.5 ? COLORS.CYAN_RGB : COLORS.FLUID_RGB,
      radiusMin: 2,
      radiusMax: 5,
      speedMin: 60,
      speedMax: 120,
      lifeMin: 1.0,
      lifeMax: 1.8,
      glow: 12,
      angleMin: 0,
      angleMax: Math.PI * 2,
      customInit(p, idx) {
        // Override velocity to flow toward sink with wave motion
        const dx = sinkX - cx;
        const dy = sinkY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = randomRange(150, 300);
        const travelTime = dist / speed;

        // Store target and wave parameters on particle
        p._targetX = sinkX + randomRange(-20, 20);
        p._targetY = sinkY + randomRange(-10, 10);
        p._originX = cx + randomRange(-rect.width / 2, rect.width / 2);
        p._originY = cy + randomRange(-rect.height / 4, rect.height / 4);
        p._travelTime = travelTime;
        p._waveAmp = randomRange(15, 40);
        p._waveFreq = randomRange(3, 6);
        p._elapsed = 0;
        p._cascadeRef = cascadeRef;
        p.x = p._originX;
        p.y = p._originY;

        // Override update to use guided flow
        const origUpdate = p.update.bind(p);
        p.update = function(dt) {
          if (!this.alive) return;
          this._elapsed += dt;
          this.life -= dt;
          if (this.life <= 0) { this.alive = false; return; }

          const t = clamp(this._elapsed / this._travelTime, 0, 1);
          const eased = easeOutQuad(t);

          // Lerp position from origin to target
          this.x = lerp(this._originX, this._targetX, eased);
          this.y = lerp(this._originY, this._targetY, eased);

          // Add wave motion perpendicular to path
          const perpX = -(this._targetY - this._originY);
          const perpY = (this._targetX - this._originX);
          const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const wave = Math.sin(this._elapsed * this._waveFreq * Math.PI * 2) * this._waveAmp * (1 - eased);
          this.x += (perpX / perpLen) * wave;
          this.y += (perpY / perpLen) * wave;

          // Flash when reaching sink
          if (t >= 0.95 && this.alive) {
            this.alive = false;
            if (this._cascadeRef && this._cascadeRef.alive) {
              this._cascadeRef.sinkFlashes.push({
                x: this.x,
                y: this.y,
                timer: 0.15
              });
            }
          }
        };
      }
    });
  }

  /** @param {CanvasRenderingContext2D} ctx */
  drawFlashes(ctx) {
    for (const flash of this.sinkFlashes) {
      const alpha = clamp(flash.timer / 0.15, 0, 1);
      const r = 8 * alpha;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha * 0.8})`;
      ctx.shadowColor = `rgba(0, 240, 255, ${alpha})`;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  get isDead() { return !this.alive; }
}

// ─── PCB Circuit Layout ─────────────────────────────────────────────────────────

/**
 * Generate and manage the static PCB circuit background.
 */
class PCBCircuit {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.gridSpacing = 80;
    /** @type {Array<{x:number, y:number, isJunction:boolean}>} */
    this.nodes = [];
    /** @type {Array<{from:number, to:number, path:Array<{x:number,y:number}>}>} */
    this.traces = [];
    /** @type {Array<{x:number, y:number, w:number, h:number}>} */
    this.pads = [];
    /** @type {Array<{traceIdx:number, progress:number, speed:number, alive:boolean}>} */
    this.pulses = [];
    /** @type {Array<{nodeIdx:number, alpha:number, decay:number}>} */
    this.nodeFlashes = [];
    this.pulseTimer = 0;
    this.flashTimer = 0;

    /** @type {OffscreenCanvas|HTMLCanvasElement|null} */
    this.staticLayer = null;

    this._generate();
  }

  /** Generate the grid nodes, traces, and pads. */
  _generate() {
    const cols = Math.ceil(this.width / this.gridSpacing) + 1;
    const rows = Math.ceil(this.height / this.gridSpacing) + 1;

    // Create nodes with slight random offset
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * this.gridSpacing + randomRange(-10, 10);
        const y = r * this.gridSpacing + randomRange(-10, 10);
        const isJunction = Math.random() < 0.15;
        this.nodes.push({ x, y, isJunction });
      }
    }

    // Connect nodes with orthogonal traces (horizontal-then-vertical)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        // Connect right
        if (c < cols - 1 && Math.random() < 0.35) {
          const rightIdx = idx + 1;
          this._addTrace(idx, rightIdx);
        }
        // Connect down
        if (r < rows - 1 && Math.random() < 0.3) {
          const downIdx = idx + cols;
          this._addTrace(idx, downIdx);
        }
        // Occasional L-shaped traces (right then down)
        if (c < cols - 1 && r < rows - 1 && Math.random() < 0.12) {
          const cornerIdx = idx + 1;
          const endIdx = idx + 1 + cols;
          if (cornerIdx < this.nodes.length && endIdx < this.nodes.length) {
            const from = this.nodes[idx];
            const corner = this.nodes[cornerIdx];
            const to = this.nodes[endIdx];
            this.traces.push({
              from: idx,
              to: endIdx,
              path: [
                { x: from.x, y: from.y },
                { x: corner.x, y: from.y },  // horizontal first
                { x: corner.x, y: to.y }     // then vertical
              ]
            });
          }
        }
      }
    }

    // Add component pads at random positions along some traces
    for (const trace of this.traces) {
      if (Math.random() < 0.08) {
        const mid = Math.floor(trace.path.length / 2);
        const pt = trace.path[mid] || trace.path[0];
        this.pads.push({
          x: pt.x - 4,
          y: pt.y - 2.5,
          w: 8,
          h: 5
        });
      }
    }
  }

  /**
   * Add a straight orthogonal trace between two nodes.
   * @param {number} fromIdx
   * @param {number} toIdx
   */
  _addTrace(fromIdx, toIdx) {
    const from = this.nodes[fromIdx];
    const to = this.nodes[toIdx];
    // Orthogonal: horizontal then vertical
    if (Math.abs(from.x - to.x) > 2 && Math.abs(from.y - to.y) > 2) {
      this.traces.push({
        from: fromIdx,
        to: toIdx,
        path: [
          { x: from.x, y: from.y },
          { x: to.x, y: from.y },
          { x: to.x, y: to.y }
        ]
      });
    } else {
      this.traces.push({
        from: fromIdx,
        to: toIdx,
        path: [
          { x: from.x, y: from.y },
          { x: to.x, y: to.y }
        ]
      });
    }
  }

  /**
   * Render the static circuit to an offscreen buffer.
   * @returns {OffscreenCanvas|HTMLCanvasElement}
   */
  renderStaticLayer() {
    let canvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(this.width, this.height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
    }
    const ctx = canvas.getContext('2d');

    // Traces
    ctx.strokeStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, 0.15)`;
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const trace of this.traces) {
      ctx.beginPath();
      ctx.moveTo(trace.path[0].x, trace.path[0].y);
      for (let i = 1; i < trace.path.length; i++) {
        ctx.lineTo(trace.path[i].x, trace.path[i].y);
      }
      ctx.stroke();
    }

    // Junction nodes (larger circles)
    for (const node of this.nodes) {
      if (node.isJunction) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, randomRange(2.5, 4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, 0.12)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, 0.2)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Component pads
    ctx.fillStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, 0.1)`;
    ctx.strokeStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, 0.18)`;
    ctx.lineWidth = 0.5;
    for (const pad of this.pads) {
      ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
    }

    this.staticLayer = canvas;
    return canvas;
  }

  /**
   * Update animated pulses and flashes.
   * @param {number} dt
   */
  update(dt) {
    // Spawn new pulses periodically
    this.pulseTimer += dt;
    if (this.pulseTimer > randomRange(0.8, 2.5)) {
      this.pulseTimer = 0;
      if (this.traces.length > 0 && this.pulses.length < 15) {
        const traceIdx = randomInt(0, this.traces.length - 1);
        this.pulses.push({
          traceIdx,
          progress: 0,
          speed: randomRange(0.4, 1.2),
          alive: true
        });
      }
    }

    // Spawn node flashes
    this.flashTimer += dt;
    if (this.flashTimer > randomRange(1.5, 4)) {
      this.flashTimer = 0;
      if (this.nodes.length > 0 && this.nodeFlashes.length < 8) {
        const nodeIdx = randomInt(0, this.nodes.length - 1);
        this.nodeFlashes.push({
          nodeIdx,
          alpha: 0.7,
          decay: randomRange(0.5, 1.5)
        });
      }
    }

    // Update pulses
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.progress += pulse.speed * dt;
      if (pulse.progress >= 1) {
        this.pulses.splice(i, 1);
      }
    }

    // Update node flashes
    for (let i = this.nodeFlashes.length - 1; i >= 0; i--) {
      const flash = this.nodeFlashes[i];
      flash.alpha -= flash.decay * dt;
      if (flash.alpha <= 0) {
        this.nodeFlashes.splice(i, 1);
      }
    }
  }

  /**
   * Draw animated elements on top of the static layer.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawAnimated(ctx) {
    // Draw pulses traveling along traces
    for (const pulse of this.pulses) {
      const trace = this.traces[pulse.traceIdx];
      if (!trace) continue;
      const pos = this._getPositionOnPath(trace.path, pulse.progress);
      if (!pos) continue;

      const alpha = pulse.progress < 0.1
        ? pulse.progress / 0.1
        : pulse.progress > 0.8
          ? (1 - pulse.progress) / 0.2
          : 1;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, ${alpha * 0.7})`;
      ctx.shadowColor = `rgba(${COLORS.CYAN_RGB.join(',')}, ${alpha * 0.5})`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Trail
      const trailPos = this._getPositionOnPath(trace.path, Math.max(0, pulse.progress - 0.08));
      if (trailPos) {
        ctx.beginPath();
        ctx.moveTo(trailPos.x, trailPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, ${alpha * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw node flashes
    for (const flash of this.nodeFlashes) {
      const node = this.nodes[flash.nodeIdx];
      if (!node) continue;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLORS.CYAN_RGB.join(',')}, ${flash.alpha * 0.5})`;
      ctx.shadowColor = `rgba(${COLORS.CYAN_RGB.join(',')}, ${flash.alpha})`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Get interpolated position along a path of points.
   * @param {Array<{x:number,y:number}>} path
   * @param {number} t - 0 to 1
   * @returns {{x:number, y:number}|null}
   */
  _getPositionOnPath(path, t) {
    if (path.length < 2) return path[0] || null;

    // Calculate total length
    let totalLen = 0;
    const segLens = [];
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segLens.push(len);
      totalLen += len;
    }
    if (totalLen === 0) return path[0];

    const targetDist = clamp(t, 0, 1) * totalLen;
    let accumulated = 0;
    for (let i = 0; i < segLens.length; i++) {
      if (accumulated + segLens[i] >= targetDist) {
        const segT = (targetDist - accumulated) / segLens[i];
        return {
          x: lerp(path[i].x, path[i + 1].x, segT),
          y: lerp(path[i].y, path[i + 1].y, segT)
        };
      }
      accumulated += segLens[i];
    }
    return path[path.length - 1];
  }
}

// ─── Canvas Engine ──────────────────────────────────────────────────────────────

/**
 * Main canvas rendering engine for NexusFlow.
 * Manages PCB background, overlay effects, particle systems, and the render loop.
 */
class CanvasEngine {
  /**
   * @param {HTMLCanvasElement} pcbCanvas - Background PCB circuit canvas
   * @param {HTMLCanvasElement} effectsCanvas - Overlay effects canvas
   */
  constructor(pcbCanvas, effectsCanvas) {
    /** @type {HTMLCanvasElement} */
    this.pcbCanvas = pcbCanvas;
    /** @type {HTMLCanvasElement} */
    this.effectsCanvas = effectsCanvas;
    /** @type {CanvasRenderingContext2D} */
    this.pcbCtx = pcbCanvas.getContext('2d');
    /** @type {CanvasRenderingContext2D} */
    this.effectsCtx = effectsCanvas.getContext('2d');

    /** @type {PCBCircuit|null} */
    this.pcb = null;
    /** @type {ParticleSystem} */
    this.particles = new ParticleSystem();
    /** @type {Shockwave[]} */
    this.shockwaves = [];
    /** @type {LightningBolt[]} */
    this.lightningBolts = [];
    /** @type {SubmissionCascade[]} */
    this.cascades = [];

    /** @type {number} */
    this.progressLevel = 0;

    /** @type {number|null} */
    this._rafId = null;
    /** @type {number} */
    this._lastTime = 0;
    /** @type {boolean} */
    this._running = false;
    /** @type {boolean} */
    this._visible = true;

    // Bind methods
    this._tick = this._tick.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
  }

  /** Initialize both canvases and start the render loop. */
  init() {
    this._syncCanvasSize();
    this._buildPCB();

    // Event listeners
    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibility);

    // Start loop
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  /** Synchronize canvas dimensions with their display size. */
  _syncCanvasSize() {
    const dpr = window.devicePixelRatio || 1;

    for (const canvas of [this.pcbCanvas, this.effectsCanvas]) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /** Generate the PCB circuit layout and render static layer. */
  _buildPCB() {
    const rect = this.pcbCanvas.getBoundingClientRect();
    this.pcb = new PCBCircuit(rect.width, rect.height);
    this.pcb.renderStaticLayer();
    this._drawPCBStatic();
  }

  /** Blit the static PCB layer to the pcb canvas. */
  _drawPCBStatic() {
    if (!this.pcb || !this.pcb.staticLayer) return;
    this.pcbCtx.save();
    this.pcbCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.pcbCtx.clearRect(0, 0, this.pcbCanvas.width, this.pcbCanvas.height);
    this.pcbCtx.drawImage(this.pcb.staticLayer, 0, 0);
    this.pcbCtx.restore();
  }

  /** Handle window resize. */
  resize() {
    this._onResize();
  }

  /** @private */
  _onResize() {
    this._syncCanvasSize();
    this._buildPCB();
  }

  /** @private */
  _onVisibility() {
    this._visible = !document.hidden;
    if (this._visible && this._running) {
      this._lastTime = performance.now();
      this._rafId = requestAnimationFrame(this._tick);
    }
  }

  /**
   * Main render loop tick.
   * @param {number} now - timestamp from requestAnimationFrame
   */
  _tick(now) {
    if (!this._running || !this._visible) return;

    const dt = Math.min((now - this._lastTime) / 1000, 0.05); // Cap at 50ms
    this._lastTime = now;

    this._update(dt);
    this._draw();

    this._rafId = requestAnimationFrame(this._tick);
  }

  /**
   * Update all systems.
   * @param {number} dt
   */
  _update(dt) {
    // PCB pulses
    if (this.pcb) this.pcb.update(dt);

    // Particles
    this.particles.update(dt);

    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].update(dt);
      if (this.shockwaves[i].isDead) this.shockwaves.splice(i, 1);
    }

    // Lightning
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      this.lightningBolts[i].update(dt);
      if (this.lightningBolts[i].isDead) this.lightningBolts.splice(i, 1);
    }

    // Cascades
    for (let i = this.cascades.length - 1; i >= 0; i--) {
      this.cascades[i].update(dt);
      if (this.cascades[i].isDead) this.cascades.splice(i, 1);
    }
  }

  /** Render all visual layers. */
  _draw() {
    // PCB: redraw static + animated overlay
    this._drawPCBStatic();
    if (this.pcb) {
      const dpr = window.devicePixelRatio || 1;
      this.pcbCtx.save();
      this.pcbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Do NOT clear - static is already drawn, draw animated on top
      this.pcb.drawAnimated(this.pcbCtx);
      this.pcbCtx.restore();
    }

    // Effects canvas: clear and redraw everything
    const ectx = this.effectsCtx;
    ectx.save();
    const dpr = window.devicePixelRatio || 1;
    ectx.setTransform(1, 0, 0, 1, 0, 0);
    ectx.clearRect(0, 0, this.effectsCanvas.width, this.effectsCanvas.height);
    ectx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Shockwaves
    for (const sw of this.shockwaves) sw.draw(ectx);

    // Lightning
    for (const lb of this.lightningBolts) lb.draw(ectx);

    // Particles
    this.particles.draw(ectx);

    // Cascade sink flashes
    for (const cascade of this.cascades) cascade.drawFlashes(ectx);

    // Fluid progress overlay (subtle)
    this._drawFluidOverlay(ectx);

    ectx.restore();
  }

  /**
   * Draw a subtle fluid shimmer overlay for the progress tube area.
   * This adds a bioluminescent ripple effect on top of the CSS progress bar.
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawFluidOverlay(ctx) {
    if (this.progressLevel <= 0) return;

    // Find the progress tube element if it exists
    const tube = document.querySelector('[data-progress-tube]');
    if (!tube) return;

    const rect = tube.getBoundingClientRect();
    const canvasRect = this.effectsCanvas.getBoundingClientRect();
    const x = rect.left - canvasRect.left;
    const y = rect.top - canvasRect.top;
    const w = rect.width;
    const h = rect.height;
    const fillW = w * this.progressLevel;

    if (fillW <= 0) return;

    const now = performance.now() / 1000;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Subtle moving wave highlights
    for (let i = 0; i < 3; i++) {
      const waveX = x + (Math.sin(now * (1.5 + i * 0.5) + i * 2) * 0.5 + 0.5) * fillW;
      const waveY = y + h / 2 + Math.sin(now * 2 + i) * (h * 0.2);
      const gradient = ctx.createRadialGradient(waveX, waveY, 0, waveX, waveY, 20);
      gradient.addColorStop(0, `rgba(${COLORS.CYAN_RGB.join(',')}, 0.15)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, fillW, h);
    }

    ctx.restore();
  }

  // ─── Public Effect Triggers ─────────────────────────────────────────────────

  /**
   * Trigger an electric shockwave at the given position.
   * Used when a form component is dropped into the builder.
   * @param {number} x - X coordinate (CSS pixels relative to effects canvas)
   * @param {number} y - Y coordinate (CSS pixels relative to effects canvas)
   */
  triggerShockwave(x, y) {
    // Add expanding ring
    this.shockwaves.push(new Shockwave(x, y, 200, 0.6, COLORS.CYAN_RGB));

    // Spawn 8-12 spark particles flying outward
    this.particles.emit({
      x, y,
      count: randomInt(8, 12),
      rgb: COLORS.CYAN_RGB,
      radiusMin: 1.5,
      radiusMax: 3,
      speedMin: 120,
      speedMax: 300,
      lifeMin: 0.25,
      lifeMax: 0.45,
      glow: 10,
      angleMin: 0,
      angleMax: Math.PI * 2
    });

    // Secondary smaller ring for depth
    setTimeout(() => {
      if (this._running) {
        this.shockwaves.push(new Shockwave(x, y, 120, 0.4, COLORS.PURPLE_RGB));
      }
    }, 80);
  }

  /**
   * Trigger an error flash with lightning at the given position.
   * Used when a validation error occurs on a form component.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  triggerErrorFlash(x, y) {
    // Lightning bolt
    this.lightningBolts.push(new LightningBolt(x, y, COLORS.ERROR_RGB));

    // Red particle burst
    this.particles.emit({
      x, y,
      count: randomInt(10, 18),
      rgb: COLORS.ERROR_RGB,
      radiusMin: 1,
      radiusMax: 3,
      speedMin: 50,
      speedMax: 180,
      lifeMin: 0.2,
      lifeMax: 0.5,
      glow: 8,
      angleMin: 0,
      angleMax: Math.PI * 2
    });

    // Screen flash: brief red overlay
    const ectx = this.effectsCtx;
    ectx.save();
    ectx.fillStyle = `rgba(${COLORS.ERROR_RGB.join(',')}, 0.06)`;
    const rect = this.effectsCanvas.getBoundingClientRect();
    ectx.fillRect(0, 0, rect.width, rect.height);
    ectx.restore();
  }

  /**
   * Start submission particle cascade from source elements to data sink.
   * Particles flow from each question block to the reactor sink.
   * @param {Array<{x:number,y:number,width:number,height:number}>} sourceRects
   * @param {{x:number,y:number,width:number,height:number}} sinkRect
   */
  triggerSubmission(sourceRects, sinkRect) {
    if (!sourceRects || sourceRects.length === 0 || !sinkRect) return;
    const cascade = new SubmissionCascade(sourceRects, sinkRect, this.particles);
    this.cascades.push(cascade);
  }

  /**
   * Update the progress tube fill level.
   * @param {number} percent - Fill level from 0 to 1
   */
  updateProgress(percent) {
    this.progressLevel = clamp(percent, 0, 1);
  }

  /** Clean up all resources and stop the render loop. */
  destroy() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibility);

    // Clear canvases
    this.pcbCtx.clearRect(0, 0, this.pcbCanvas.width, this.pcbCanvas.height);
    this.effectsCtx.clearRect(0, 0, this.effectsCanvas.width, this.effectsCanvas.height);

    // Release references
    this.pcb = null;
    this.particles = new ParticleSystem();
    this.shockwaves = [];
    this.lightningBolts = [];
    this.cascades = [];
  }
}

export default CanvasEngine;
