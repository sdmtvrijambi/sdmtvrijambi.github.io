/**
 * UI/UX Pro Max 3D Motion Primitives & Cat Mascot Controller
 * Implements physically-grounded 3D tilt, ambient cursor light,
 * spatial theme management, cat audio synth, and 60fps Cat Background Motion canvas.
 */

class CatMascot {
  constructor() {
    this.catElement = document.getElementById('cat-mascot');
    this.audioCtx = null;

    this.initAudio();
    this.bindEvents();
  }

  initAudio() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  playMeowSound() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      // Pure harmonic synth meow sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.38);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {
      console.warn('Meow audio error', e);
    }
  }

  spawnPawPrint(x, y) {
    const paw = document.createElement('div');
    paw.className = 'paw-print';
    const rot = (Math.random() - 0.5) * 45;
    paw.style.setProperty('--paw-rot', `${rot}deg`);
    paw.style.left = `${x - 14}px`;
    paw.style.top = `${y - 14}px`;
    paw.innerHTML = '<i class="fas fa-paw"></i>';
    document.body.appendChild(paw);

    setTimeout(() => paw.remove(), 1100);
  }

  bindEvents() {
    if (this.catElement) {
      this.catElement.addEventListener('click', (e) => {
        this.playMeowSound();
        const rect = this.catElement.getBoundingClientRect();
        this.spawnPawPrint(rect.left + rect.width / 2, rect.top);

        // 3D wiggle spring animation
        this.catElement.animate([
          { transform: 'scale(1) rotate(0deg)' },
          { transform: 'scale(1.2) rotate(-10deg)', offset: 0.25 },
          { transform: 'scale(1.15) rotate(10deg)', offset: 0.5 },
          { transform: 'scale(1.05) rotate(-4deg)', offset: 0.75 },
          { transform: 'scale(1) rotate(0deg)' }
        ], {
          duration: 500,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        });
      });
    }

    document.addEventListener('click', (e) => {
      // Don't spawn over inputs or interactive buttons to keep clean
      if (e.target.closest('input, button, a')) return;
      if (Math.random() > 0.5) {
        this.spawnPawPrint(e.clientX, e.clientY);
      }
    });
  }
}

/**
 * ============================================================================
 * BEAUTIFUL PROCEDURAL WALKING CAT ANIMATION ENGINE (UI/UX PRO MAX)
 * Features 4-legged articulated quadruped walk cycles, soft shadow,
 * glowing ground pawprint footprints, wagging tail, blinking eyes,
 * ear twitches, speech bubbles, mouse curiosity, and joyful interactive jumps.
 * ============================================================================
 */
class WalkingCat {
  constructor(options = {}) {
    this.name = options.name || 'Inyong';
    this.x = options.x || 100;
    this.groundY = 0;
    this.scale = options.scale || 1.5;
    this.speed = options.speed || 1.2;
    this.direction = options.direction || 1; // 1 = right, -1 = left
    this.walkPhase = options.walkPhase || Math.random() * Math.PI * 2;
    this.tailPhase = Math.random() * Math.PI * 2;
    
    // States: 'WALKING', 'PAUSED', 'HAPPY_JUMP'
    this.state = 'WALKING';
    this.pauseTimer = 0;
    
    // Blinking & Ear Twitch
    this.blinkTimer = Math.random() * 180 + 100;
    this.isBlinking = false;
    this.earTwitchTimer = Math.random() * 240 + 120;
    this.earTwitch = 0;
    
    // Jump Physics
    this.jumpY = 0;
    this.jumpVy = 0;
    this.jumpRotation = 0;
    
    // Speech Bubble Emotes
    this.emotes = options.emotes || ['Nyaa~ 🐾', 'Purr ✨', '❤️', 'Meow!', '🐾'];
    this.currentEmote = null;
    this.emoteAlpha = 0;
    this.emoteTimer = Math.random() * 200 + 100;
    
    // Appearance & Styling
    this.bodyColor = options.bodyColor || '#f97316';
    this.shadeColor = options.shadeColor || '#ffedd5';
    this.spotColor = options.spotColor || null;
    this.hasStripes = options.hasStripes || false;
    this.stripeColor = options.stripeColor || '#c2410c';
    this.sockColor = options.sockColor || '#ffffff';
    this.collarColor = options.collarColor || '#ef4444';
    this.eyeColor = options.eyeColor || '#10b981';
    this.pawColor = options.pawColor || 'rgba(239, 68, 68, 0.55)';
    this.hasBell = options.hasBell !== false;
    
    this.headLookAngle = 0;
    this.lastStepCycle = 0;
  }
  
  update(width, height, mouseX, mouseY, pawPrints, particles) {
    // Positioned along the bottom track of the footer canvas
    this.groundY = height - 16;
    
    // Jump Physics
    if (this.state === 'HAPPY_JUMP') {
      this.jumpY += this.jumpVy;
      this.jumpVy += 0.55;
      this.jumpRotation = (this.jumpVy < 0 ? -0.2 : 0.15) * this.direction;
      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpVy = 0;
        this.jumpRotation = 0;
        this.state = 'WALKING';
      }
    }
    
    // Blinking cycle
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      if (this.blinkTimer <= -14) {
        this.isBlinking = false;
        this.blinkTimer = Math.random() * 240 + 140;
      }
    }
    
    // Ear twitch cycle
    this.earTwitchTimer--;
    if (this.earTwitchTimer <= 0) {
      this.earTwitch = Math.sin(this.earTwitchTimer * 0.6) * 4;
      if (this.earTwitchTimer <= -22) {
        this.earTwitch = 0;
        this.earTwitchTimer = Math.random() * 320 + 180;
      }
    }

    // Emote Speech Bubble cycle
    this.emoteTimer--;
    if (this.emoteTimer <= 0 && !this.currentEmote) {
      this.currentEmote = this.emotes[Math.floor(Math.random() * this.emotes.length)];
      this.emoteAlpha = 1;
      this.emoteTimer = Math.random() * 400 + 350;
    } else if (this.currentEmote) {
      this.emoteAlpha -= 0.007;
      if (this.emoteAlpha <= 0) {
        this.currentEmote = null;
      }
    }
    
    // State actions
    if (this.state === 'WALKING') {
      this.x += this.speed * this.direction;
      this.walkPhase += 0.082 * (this.speed / 1.2);
      this.tailPhase += 0.058;
      
      // Spawn ambient soft sparkles & hearts
      if (Math.random() < 0.04) {
        particles.push({
          x: this.x + (Math.random() - 0.5) * 30 * this.scale,
          y: this.groundY - 14 * this.scale - Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.4 - Math.random() * 0.5,
          size: (2.2 + Math.random() * 2.5) * this.scale,
          alpha: 0.9,
          color: this.collarColor,
          type: Math.random() > 0.5 ? 'heart' : 'sparkle',
          life: 70
        });
      }
      
      // Spawn footprint pawprints on ground contacts
      const stepCycle = Math.sin(this.walkPhase);
      if (this.lastStepCycle < 0 && stepCycle >= 0) {
        const pawX = this.x + (this.direction > 0 ? 14 : -14) * this.scale;
        pawPrints.push({
          x: pawX,
          y: this.groundY + 4 * this.scale,
          alpha: 0.65,
          color: this.pawColor,
          scale: this.scale,
          life: 280
        });
      } else if (this.lastStepCycle > 0 && stepCycle <= 0) {
        const pawX = this.x - (this.direction > 0 ? 14 : -14) * this.scale;
        pawPrints.push({
          x: pawX,
          y: this.groundY + 4 * this.scale,
          alpha: 0.65,
          color: this.pawColor,
          scale: this.scale,
          life: 280
        });
      }
      this.lastStepCycle = stepCycle;
      
      // Edge boundary turnaround
      const margin = 70 * this.scale;
      if (this.direction > 0 && this.x > width + margin) {
        this.direction = -1;
        this.state = 'PAUSED';
        this.pauseTimer = 60 + Math.random() * 40;
      } else if (this.direction < 0 && this.x < -margin) {
        this.direction = 1;
        this.state = 'PAUSED';
        this.pauseTimer = 60 + Math.random() * 40;
      } else if (Math.random() < 0.001) {
        this.state = 'PAUSED';
        this.pauseTimer = 80 + Math.random() * 60;
      }
    } else if (this.state === 'PAUSED') {
      this.pauseTimer--;
      this.tailPhase += 0.048;
      if (this.pauseTimer <= 0) {
        this.state = 'WALKING';
      }
    }
    
    // Smooth head look tracking towards mouse
    const dx = mouseX - this.x;
    const dy = mouseY - (this.groundY - 20 * this.scale);
    const dist = Math.hypot(dx, dy);
    if (dist < 320 && dist > 15) {
      const targetAngle = Math.atan2(dy, dx * this.direction);
      const clamped = Math.max(-0.4, Math.min(0.4, targetAngle));
      this.headLookAngle += (clamped - this.headLookAngle) * 0.12;
    } else {
      this.headLookAngle += (0 - this.headLookAngle) * 0.08;
    }
  }
  
  triggerJump(particles) {
    this.state = 'HAPPY_JUMP';
    this.jumpVy = -7.8;
    this.currentEmote = '❤️ Nyaa~! ✨';
    this.emoteAlpha = 1.0;
    if (particles) {
      for (let i = 0; i < 9; i++) {
        particles.push({
          x: this.x + (Math.random() - 0.5) * 35 * this.scale,
          y: this.groundY - 25 * this.scale,
          vx: (Math.random() - 0.5) * 2.8,
          vy: -1.8 - Math.random() * 3.0,
          size: 3.0 + Math.random() * 3.0,
          alpha: 1.0,
          color: i % 2 === 0 ? '#ec4899' : (i % 3 === 0 ? '#f59e0b' : '#38bdf8'),
          type: i % 2 === 0 ? 'heart' : 'sparkle',
          life: 85
        });
      }
    }
  }
  
  draw(ctx) {
    ctx.save();
    const currentY = this.groundY + this.jumpY;
    ctx.translate(this.x, currentY);
    ctx.rotate(this.jumpRotation);
    ctx.scale(this.direction * this.scale, this.scale);
    
    const isWalking = this.state === 'WALKING';
    const wp = this.walkPhase;
    const tp = this.tailPhase;
    const bobY = isWalking ? Math.sin(wp * 2) * 1.8 : 0;
    
    // 1. Soft Dynamic Ground Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.beginPath();
    const shadowScale = 1 - Math.min(0.65, Math.abs(this.jumpY) / 70);
    ctx.ellipse(0, 4.0, 26 * shadowScale, 5.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // 2. Far Legs (Back-Right & Front-Right) - Shaded depth
    this.drawLeg(ctx, 12, 0, wp + Math.PI, true);
    this.drawLeg(ctx, -14, 0, wp + Math.PI * 1.75, true);
    
    // 3. Graceful Animated Tail
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 5.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const tailBaseX = -18;
    const tailBaseY = -12 + bobY;
    ctx.moveTo(tailBaseX, tailBaseY);
    const tCtrl1X = tailBaseX - 10;
    const tCtrl1Y = tailBaseY - 10 + Math.sin(tp) * 4.0;
    const tCtrl2X = tailBaseX - 17;
    const tCtrl2Y = tailBaseY - 25 + Math.sin(tp + 1.1) * 6.5;
    const tEndX = tailBaseX - 12 + Math.cos(tp * 1.4) * 3.5;
    const tEndY = tailBaseY - 34 + Math.sin(tp + 2.1) * 7.5;
    ctx.bezierCurveTo(tCtrl1X, tCtrl1Y, tCtrl2X, tCtrl2Y, tEndX, tEndY);
    ctx.stroke();

    ctx.strokeStyle = this.bodyColor;
    ctx.lineWidth = 4.4;
    ctx.stroke();
    
    // Tail Tip Accent / Socks
    if (this.sockColor) {
      ctx.fillStyle = this.sockColor;
      ctx.beginPath();
      ctx.arc(tEndX, tEndY, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    
    // 4. Cat Main Torso with Soft Belly Shading & Stripes
    ctx.save();
    ctx.translate(0, bobY);
    
    // Body Base Outline
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -11.5, 21, 11.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Soft Belly Fur
    ctx.fillStyle = this.shadeColor;
    ctx.beginPath();
    ctx.ellipse(0, -7.0, 18, 5.5, 0, 0, Math.PI);
    ctx.fill();

    // Tiger Stripes (if ginger tabby)
    if (this.hasStripes) {
      ctx.strokeStyle = this.stripeColor;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -18); ctx.lineTo(-4, -10);
      ctx.moveTo(1, -19);  ctx.lineTo(2, -11);
      ctx.moveTo(8, -17);  ctx.lineTo(7, -10);
      ctx.stroke();
    }
    
    // Calico Spot
    if (this.spotColor) {
      ctx.fillStyle = this.spotColor;
      ctx.beginPath();
      ctx.ellipse(-4.0, -15.5, 8.5, 5.0, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 5. Near Legs (Back-Left & Front-Left)
    this.drawLeg(ctx, 12, 0, wp, false);
    this.drawLeg(ctx, -14, 0, wp + Math.PI * 0.75, false);
    
    // 6. Cat Head, Expressive Face, Whiskers & Shiny Collar
    const headX = 18;
    const headY = -18 + bobY * 0.6;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(this.headLookAngle);
    
    // Ears
    // Left Ear (Far)
    ctx.fillStyle = this.bodyColor;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(-8, -21 + this.earTwitch);
    ctx.lineTo(2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Left Ear Pink Interior
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(-7, -18 + this.earTwitch);
    ctx.lineTo(0, -10);
    ctx.closePath();
    ctx.fill();
    
    // Right Ear (Near)
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    ctx.moveTo(3, -7);
    ctx.lineTo(9, -22);
    ctx.lineTo(11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right Ear Pink Interior
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.lineTo(8, -19);
    ctx.lineTo(10, -8);
    ctx.closePath();
    ctx.fill();
    
    // Head Sphere
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    ctx.arc(2.5, -4.0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Head Marking / Spot
    if (this.spotColor) {
      ctx.fillStyle = this.spotColor;
      ctx.beginPath();
      ctx.arc(7.0, -10.5, 4.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.hasStripes) {
      ctx.strokeStyle = this.stripeColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(2.5, -14); ctx.lineTo(2.5, -9);
      ctx.moveTo(6.5, -13); ctx.lineTo(5.5, -8.5);
      ctx.stroke();
    }
    
    // Rosy Cheeks Blush
    ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
    ctx.beginPath();
    ctx.arc(-2.0, -1.0, 3.6, 0, Math.PI * 2);
    ctx.arc(8.5, -1.0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    if (this.isBlinking) {
      // Cute Smiling Eyes `^ ^`
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(1.5, -4.0, 2.8, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8.0, -4.0, 2.8, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();
    } else {
      // Big Glossy Anime Eyes
      ctx.fillStyle = this.eyeColor;
      ctx.beginPath();
      ctx.ellipse(2.5, -4.0, 3.0, 4.0, 0, 0, Math.PI * 2);
      ctx.ellipse(8.5, -4.0, 3.0, 4.0, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(2.5, -4.0, 2.0, 0, Math.PI * 2);
      ctx.arc(8.5, -4.0, 2.0, 0, Math.PI * 2);
      ctx.fill();
      // Dual Sparkle Highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(1.6, -5.3, 1.2, 0, Math.PI * 2);
      ctx.arc(7.6, -5.3, 1.2, 0, Math.PI * 2);
      ctx.arc(3.4, -3.0, 0.65, 0, Math.PI * 2);
      ctx.arc(9.4, -3.0, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Cute Pink Nose
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(5.8, -0.4);
    ctx.lineTo(4.4, -2.0);
    ctx.lineTo(7.2, -2.0);
    ctx.closePath();
    ctx.fill();
    
    // Smile Mouth `w`
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(4.4, 0.6, 1.7, 0, Math.PI);
    ctx.arc(7.2, 0.6, 1.7, 0, Math.PI);
    ctx.stroke();
    
    // Bouncing Whiskers
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -1.0);  ctx.lineTo(-8.0, -2.6);
    ctx.moveTo(0, 1.2);   ctx.lineTo(-8.0, 2.8);
    ctx.moveTo(11, -1.0); ctx.lineTo(19, -2.6);
    ctx.moveTo(11, 1.2);  ctx.lineTo(19, 2.8);
    ctx.stroke();
    
    // Collar & Shiny Gold Jingle Bell
    ctx.strokeStyle = this.collarColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 3.8, 7.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    
    if (this.hasBell) {
      const bellWiggle = Math.sin(wp * 2) * 0.4;
      ctx.save();
      ctx.translate(0, 9.5);
      ctx.rotate(bellWiggle);
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0.9, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    ctx.restore(); // end head
    ctx.restore(); // end body

    // 7. Floating Speech Bubble (if active)
    if (this.currentEmote && this.emoteAlpha > 0.02) {
      ctx.save();
      ctx.scale(this.direction, 1); // unflip text direction
      ctx.translate(headX + 5, headY - 32 + bobY);
      ctx.globalAlpha = Math.min(1, this.emoteAlpha * 1.2);
      
      ctx.font = 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(this.currentEmote).width;
      const bubbleW = textWidth + 14;
      const bubbleH = 20;

      // Bubble background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 6;
      
      ctx.beginPath();
      ctx.roundRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 8);
      ctx.fill();
      ctx.stroke();

      // Little Pointer Triangle
      ctx.beginPath();
      ctx.moveTo(-3, bubbleH / 2);
      ctx.lineTo(0, bubbleH / 2 + 4);
      ctx.lineTo(3, bubbleH / 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();
      ctx.stroke();

      // Bubble Text
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.currentEmote, 0, 0);

      ctx.restore();
    }

    ctx.restore(); // end cat
  }
  
  drawLeg(ctx, hipX, hipY, phase, isFar) {
    ctx.save();
    const isWalking = this.state === 'WALKING';
    const swing = isWalking ? Math.sin(phase) : 0;
    const lift = isWalking ? Math.max(0, -Math.cos(phase)) : 0;
    
    const hipOffsetY = -7.0;
    const upperLen = 7.5;
    const lowerLen = 7.5;
    
    const upperAngle = swing * 0.45 + (isFar ? 0.06 : 0);
    const kneeX = hipX + Math.sin(upperAngle) * upperLen;
    const kneeY = hipOffsetY + Math.cos(upperAngle) * upperLen;
    
    const lowerAngle = upperAngle - lift * 0.7;
    const pawX = kneeX + Math.sin(lowerAngle) * lowerLen;
    const pawY = kneeY + Math.cos(lowerAngle) * lowerLen - lift * 3.6;
    
    // Leg Stroke Outline
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = isFar ? 4.2 : 4.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipOffsetY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(pawX, pawY);
    ctx.stroke();

    // Leg Fill
    ctx.strokeStyle = isFar ? (this.shadeColor || this.bodyColor) : this.bodyColor;
    ctx.lineWidth = isFar ? 3.4 : 4.0;
    ctx.stroke();
    
    // Little Round White Sock / Paw
    ctx.fillStyle = this.sockColor || (isFar ? this.shadeColor : this.bodyColor);
    ctx.beginPath();
    ctx.ellipse(pawX + (this.direction > 0 ? 0.8 : -0.8), pawY, 2.4, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * Fluttering Magical Butterfly
 */
class MagicalButterfly {
  constructor(width, height) {
    this.reset(width, height);
  }
  reset(width, height) {
    this.x = Math.random() * (width || 800);
    this.y = (height || 85) - 35 - Math.random() * 25;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = (Math.random() - 0.5) * 0.35;
    this.wingAngle = 0;
    this.color = Math.random() > 0.5 ? '#f472b6' : '#38bdf8';
    this.size = 5.0 + Math.random() * 2.0;
  }
  update(width, height) {
    this.wingAngle += 0.28;
    this.x += this.vx + Math.sin(this.wingAngle * 0.5) * 0.5;
    this.y += this.vy + Math.cos(this.wingAngle * 0.4) * 0.35;
    
    const minY = 10;
    const maxY = (height || 85) - 15;
    if (this.y < minY || this.y > maxY) this.vy *= -1;
    if (this.x < -30) this.x = width + 30;
    if (this.x > width + 30) this.x = -30;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const flap = Math.abs(Math.sin(this.wingAngle));
    
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.85;
    // Left Wings
    ctx.beginPath();
    ctx.ellipse(-this.size * flap * 0.6, -this.size * 0.4, this.size * flap, this.size * 0.8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right Wings
    ctx.beginPath();
    ctx.ellipse(this.size * flap * 0.6, -this.size * 0.4, this.size * flap, this.size * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Butterfly Body
    ctx.fillStyle = '#0f172a';
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.4, 4.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initCatBackgroundMotion() {
  const canvas = document.getElementById('footer-cat-canvas') || document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 800, height = 85;
  let groundPawPrints = [];
  let magicParticles = [];
  let butterfly = null;
  let walkingCats = [];
  let mouseX = -1000, mouseY = -1000;
  let targetMouseX = -1000, targetMouseY = -1000;

  function resize() {
    const parent = canvas.parentElement;
    width = canvas.width = parent ? parent.clientWidth : window.innerWidth;
    height = canvas.height = 85;
    initWalkingCats();
    if (!butterfly) butterfly = new MagicalButterfly(width, height);
  }

  function initWalkingCats() {
    walkingCats = [
      // Cat 1: Milo (The Vibrant Orange Ginger Tabby / Oyen)
      new WalkingCat({
        name: 'Milo',
        x: width * 0.15,
        scale: 1.18,
        speed: 1.15,
        direction: 1,
        bodyColor: '#f97316',
        shadeColor: '#ffedd5',
        hasStripes: true,
        stripeColor: '#c2410c',
        sockColor: '#ffffff',
        collarColor: '#ef4444',
        eyeColor: '#10b981',
        pawColor: 'rgba(249, 115, 22, 0.6)',
        emotes: ['🐾 Nyaa~', 'Wawok! ✨', '(=^･ω･^=)', 'Purr ❤️'],
        walkPhase: 0
      }),
      // Cat 2: Princess Inyong (Snow White Anggora with Sapphire Eyes)
      new WalkingCat({
        name: 'Inyong',
        x: width * 0.8,
        scale: 1.12,
        speed: 0.95,
        direction: -1,
        bodyColor: '#ffffff',
        shadeColor: '#e0e7ff',
        sockColor: '#ffffff',
        collarColor: '#ec4899',
        eyeColor: '#0284c7',
        pawColor: 'rgba(236, 72, 153, 0.6)',
        emotes: ['✨ Meow~', 'Inyong Boronyong 🌸', 'Purr~', '🐾'],
        walkPhase: Math.PI * 0.6
      }),
      // Cat 3: Oreo (Playful Calico/Tuxedo)
      new WalkingCat({
        name: 'Oreo',
        x: width * 0.45,
        scale: 1.05,
        speed: 1.35,
        direction: 1,
        bodyColor: '#1e293b',
        shadeColor: '#f8fafc',
        spotColor: '#f97316',
        sockColor: '#ffffff',
        collarColor: '#06b6d4',
        eyeColor: '#f59e0b',
        pawColor: 'rgba(6, 182, 212, 0.6)',
        emotes: ['Meow! 🐾', 'Oreo gigit✨', 'aw dar! ❤️'],
        walkPhase: Math.PI * 1.2
      })
    ];
  }

  function drawGroundPawPrint(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale * 0.85, p.scale * 0.85);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.8, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const toes = [
      { dx: -4.2, dy: -3.6, r: 1.6 },
      { dx: -1.6, dy: -5.2, r: 1.8 },
      { dx: 1.6, dy: -5.2, r: 1.8 },
      { dx: 4.2, dy: -3.6, r: 1.6 }
    ];
    toes.forEach(t => {
      ctx.beginPath();
      ctx.arc(t.dx, t.dy, t.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawMagicParticle(pt) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha);
    ctx.fillStyle = pt.color;
    ctx.translate(pt.x, pt.y);

    if (pt.type === 'heart') {
      ctx.scale(pt.size * 0.25, pt.size * 0.25);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-5, -5, -9, 1, 0, 8);
      ctx.bezierCurveTo(9, 1, 5, -5, 0, 0);
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(Math.cos(i * Math.PI / 2) * pt.size, Math.sin(i * Math.PI / 2) * pt.size);
        ctx.lineTo(Math.cos(i * Math.PI / 2 + Math.PI / 4) * (pt.size * 0.35), Math.sin(i * Math.PI / 2 + Math.PI / 4) * (pt.size * 0.35));
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    targetMouseX = e.clientX - rect.left;
    targetMouseY = e.clientY - rect.top;
  });

  // Global function to trigger cats jumping
  window.triggerCatJump = function() {
    walkingCats.forEach(cat => cat.triggerJump(magicParticles));
    if (window.catMascot && window.catMascot.playMeowSound) {
      window.catMascot.playMeowSound();
    }
  };

  // Interactive Click on footer canvas to make nearest walking cat jump happily
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    let nearestCat = null;
    let minDist = 9999;
    walkingCats.forEach(cat => {
      const d = Math.hypot(clickX - cat.x, clickY - (cat.groundY - 15));
      if (d < minDist) {
        minDist = d;
        nearestCat = cat;
      }
    });

    if (nearestCat) {
      nearestCat.triggerJump(magicParticles);
      if (window.catMascot && window.catMascot.playMeowSound) {
        window.catMascot.playMeowSound();
      }
    }
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    // 1. Draw Ground Paw Prints (fading out smoothly)
    for (let i = groundPawPrints.length - 1; i >= 0; i--) {
      const paw = groundPawPrints[i];
      paw.life--;
      paw.alpha *= 0.992;
      drawGroundPawPrint(paw);
      if (paw.life <= 0 || paw.alpha <= 0.01) {
        groundPawPrints.splice(i, 1);
      }
    }

    // 2. Draw Fluttering Butterfly
    if (butterfly) {
      butterfly.update(width, height);
      butterfly.draw(ctx);
    }

    // 3. Update & Draw Walking Cats (Footer only)
    walkingCats.forEach(cat => {
      cat.update(width, height, mouseX, mouseY, groundPawPrints, magicParticles);
      cat.draw(ctx);
    });

    // 4. Draw Sparkles & Heart Particles
    for (let i = magicParticles.length - 1; i >= 0; i--) {
      const pt = magicParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.014;
      pt.size *= 0.985;
      drawMagicParticle(pt);
      if (pt.alpha <= 0 || pt.size <= 0.5) {
        magicParticles.splice(i, 1);
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
}

/**
 * ============================================================================
 * SMOOTH FULLSCREEN CAT-THEMED AMBIENT BACKGROUND MOTION (BEHIND CARDS)
 * Features soft floating cat paws, kitten heads, yarn balls, swimming fishes,
 * glowing sparkles, and responsive interactive mouse repulsion breezes.
 * ============================================================================
 */
function initAmbientCatBackgroundMotion() {
  const canvas = document.getElementById('bg-cat-ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;
  let particles = [];
  let mouseX = -1000, mouseY = -1000;
  let targetMouseX = -1000, targetMouseY = -1000;

  const types = ['paw', 'paw', 'cat_head', 'yarn', 'fish', 'sparkle'];
  const colorPalettes = [
    'rgba(59, 130, 246, ',   // Sky Blue
    'rgba(99, 102, 241, ',   // Indigo
    'rgba(244, 114, 182, ',  // Pastel Pink
    'rgba(168, 85, 247, ',   // Soft Lavender
    'rgba(20, 184, 166, ',   // Soft Teal
    'rgba(245, 158, 11, '    // Warm Gold
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }

  function initParticles() {
    particles = [];
    const count = Math.min(Math.floor((width * height) / 32000), 36);

    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const type = types[Math.floor(Math.random() * types.length)];
      const colorPrefix = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        type: type,
        depth: depth,
        size: (16 + depth * 28),
        speedY: 0.22 + depth * 0.42,
        speedX: (Math.random() - 0.5) * (0.2 + depth * 0.2),
        swayFreq: 0.003 + Math.random() * 0.003,
        swayAmp: 0.4 + depth * 0.5,
        phase: Math.random() * Math.PI * 2,
        angle: (Math.random() - 0.5) * 0.8,
        angleSpeed: (Math.random() - 0.5) * 0.006,
        wagPhase: Math.random() * Math.PI * 2,
        alpha: 0.04 + depth * 0.065,
        maxAlpha: 0.07 + depth * 0.08,
        pulseSpeed: 0.01 + Math.random() * 0.015,
        pulsePhase: Math.random() * Math.PI * 2,
        colorPrefix: colorPrefix,
        vx: 0,
        vy: 0
      });
    }
  }

  function drawPaw(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.colorPrefix + alpha + ')';

    const r = p.size * 0.5;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.9, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    const toes = [
      { dx: -r * 0.65, dy: -r * 0.5, rad: r * 0.32 },
      { dx: -r * 0.22, dy: -r * 0.82, rad: r * 0.35 },
      { dx: r * 0.22, dy: -r * 0.82, rad: r * 0.35 },
      { dx: r * 0.65, dy: -r * 0.5, rad: r * 0.32 }
    ];
    toes.forEach(t => {
      ctx.beginPath();
      ctx.arc(t.dx, t.dy, t.rad, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawCatHead(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.colorPrefix + alpha + ')';

    const r = p.size * 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.45);
    ctx.lineTo(-r * 0.95, -r * 1.35);
    ctx.lineTo(-r * 0.15, -r * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.45);
    ctx.lineTo(r * 0.95, -r * 1.35);
    ctx.lineTo(r * 0.15, -r * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawYarn(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    
    const r = p.size * 0.45;
    ctx.fillStyle = p.colorPrefix + alpha + ')';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.colorPrefix + (alpha * 1.6) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(r * 0.8, r * 0.5);
    const wave = Math.sin(p.wagPhase) * 6;
    ctx.bezierCurveTo(r + 8, r + 6 + wave, r + 14, r + 16, r + 22, r + 24 + wave);
    ctx.stroke();

    ctx.restore();
  }

  function drawFish(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle * 0.4);
    ctx.fillStyle = p.colorPrefix + alpha + ')';

    const r = p.size * 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const wag = Math.sin(p.wagPhase) * 3;
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, 0);
    ctx.lineTo(-r * 1.7, -r * 0.65 + wag);
    ctx.lineTo(-r * 1.7, r * 0.65 + wag);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 1.5) + ')';
    ctx.beginPath();
    ctx.arc(r * 0.6, -r * 0.15, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSparkle(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle * 1.5);
    ctx.fillStyle = p.colorPrefix + (alpha * 1.3) + ')';

    const s = p.size * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(Math.cos(i * Math.PI / 2) * s, Math.sin(i * Math.PI / 2) * s);
      ctx.lineTo(Math.cos(i * Math.PI / 2 + Math.PI / 4) * (s * 0.35), Math.sin(i * Math.PI / 2 + Math.PI / 4) * (s * 0.35));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    particles.forEach(p => {
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dist = Math.hypot(dx, dy);
      const repulseDist = 140 * (0.6 + p.depth * 0.4);

      if (dist < repulseDist && dist > 0) {
        const force = (1 - dist / repulseDist) * 0.5 * (0.5 + p.depth * 0.5);
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      p.vx *= 0.94;
      p.vy *= 0.94;

      p.y -= (p.speedY + p.vy);
      p.x += Math.sin(p.y * p.swayFreq + p.phase) * p.swayAmp + p.speedX + p.vx;
      p.angle += p.angleSpeed;
      p.wagPhase += 0.045;
      p.pulsePhase += p.pulseSpeed;

      const currentAlpha = Math.max(0.02, p.alpha + Math.sin(p.pulsePhase) * (p.maxAlpha * 0.35));

      if (p.type === 'paw') {
        drawPaw(p, currentAlpha);
      } else if (p.type === 'cat_head') {
        drawCatHead(p, currentAlpha);
      } else if (p.type === 'yarn') {
        drawYarn(p, currentAlpha);
      } else if (p.type === 'fish') {
        drawFish(p, currentAlpha);
      } else {
        drawSparkle(p, currentAlpha);
      }

      if (p.y < -p.size * 2) {
        p.y = height + p.size * 2;
        p.x = Math.random() * width;
        p.vx = 0;
        p.vy = 0;
      }
      if (p.x < -p.size * 2) p.x = width + p.size * 2;
      if (p.x > width + p.size * 2) p.x = -p.size * 2;
    });

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
}

/**
 * UI/UX Pro Max 3D Perspective Card Tilt with High-Performance RAF Physics & Dynamic Specular Glare
 */
function initPerspectiveTilt(el, { maxTilt = 4.5, scale = 1.008 } = {}) {
  if (!el) return;

  let bounds = el.getBoundingClientRect();
  let mouseX = 0, mouseY = 0;
  let currTiltX = 0, currTiltY = 0;
  let isHovered = false;
  let rafId = null;

  function updateBounds() {
    bounds = el.getBoundingClientRect();
  }

  function loop() {
    if (!isHovered) {
      currTiltX += (0 - currTiltX) * 0.1;
      currTiltY += (0 - currTiltY) * 0.1;
      if (Math.abs(currTiltX) < 0.01 && Math.abs(currTiltY) < 0.01) {
        el.style.transform = '';
        rafId = null;
        return;
      }
    } else {
      const targetTiltY = (mouseX / bounds.width - 0.5) * maxTilt * 2;
      const targetTiltX = -(mouseY / bounds.height - 0.5) * maxTilt * 2;

      currTiltX += (targetTiltX - currTiltX) * 0.12;
      currTiltY += (targetTiltY - currTiltY) * 0.12;
    }

    const currentScale = isHovered ? scale : 1;
    el.style.transform = `perspective(var(--perspective-card)) rotateX(${currTiltX.toFixed(2)}deg) rotateY(${currTiltY.toFixed(2)}deg) scale3d(${currentScale}, ${currentScale}, 1)`;

    if (isHovered) {
      const pctX = ((mouseX / bounds.width) * 100).toFixed(1);
      const pctY = ((mouseY / bounds.height) * 100).toFixed(1);
      el.style.setProperty('--mouse-x', `${pctX}%`);
      el.style.setProperty('--mouse-y', `${pctY}%`);
    }

    rafId = requestAnimationFrame(loop);
  }

  el.addEventListener('mouseenter', (e) => {
    updateBounds();
    isHovered = true;
    mouseX = e.clientX - bounds.left;
    mouseY = e.clientY - bounds.top;
    if (!rafId) rafId = requestAnimationFrame(loop);
  });

  el.addEventListener('mousemove', (e) => {
    mouseX = e.clientX - bounds.left;
    mouseY = e.clientY - bounds.top;
  });

  el.addEventListener('mouseleave', () => {
    isHovered = false;
  });

  window.addEventListener('resize', updateBounds);
}

/**
 * UI/UX Pro Max Ambient Cursor Light Follower with Smooth Spring Damping
 */
function initCursorLight(size = 480, opacity = 0.045) {
  const light = document.createElement('div');
  light.style.cssText = `
    position: fixed; pointer-events: none; z-index: -1;
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: radial-gradient(circle, var(--accent-glow), transparent 70%);
    opacity: ${opacity};
    transform: translate(-50%, -50%);
    transition: opacity 0.4s ease;
    will-change: transform, left, top;
  `;
  document.body.appendChild(light);

  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let cx = x, cy = y;

  document.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
  });

  function update() {
    cx += (x - cx) * 0.07;
    cy += (y - cy) * 0.07;
    light.style.left = `${cx.toFixed(1)}px`;
    light.style.top = `${cy.toFixed(1)}px`;
    requestAnimationFrame(update);
  }
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  window.catMascot = new CatMascot();

  initCatBackgroundMotion();
  initAmbientCatBackgroundMotion();
  initCursorLight();

  const cards = document.querySelectorAll('.pro-card, .footer-card');
  cards.forEach(card => initPerspectiveTilt(card));
});

