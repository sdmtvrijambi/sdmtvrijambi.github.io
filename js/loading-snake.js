/**
 * Loading Screen - Robot Snake chasing a Blue Orb
 * A metallic robot snake circles around a glowing blue orb
 */

(function () {
    const canvas = document.getElementById('loading-snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const orbitRadius = 90;

    // Snake configuration
    const segmentCount = 22;
    const headSize = 14;
    const segmentBaseSize = 11;
    const segmentSpacing = 13;

    // Snake state
    let angle = 0;
    const snakeSpeed = 0.025; // radians per frame
    let animationId = null;

    // Color palette - metallic steel blue
    const colors = {
        bodyDark: '#4a6a8a',
        bodyMid: '#6a8db5',
        bodyLight: '#8bb0d6',
        bodyHighlight: '#b0d4f1',
        accent: '#00ccff',
        accentGlow: 'rgba(0, 180, 255, 0.5)',
        jointDark: '#3a5a7a',
        jointLight: '#7aaad0',
        eyeColor: '#00eeff',
        orbCore: '#1a8fff',
        orbGlow: 'rgba(30, 120, 255, 0.6)',
        orbOuter: 'rgba(0, 150, 255, 0.15)',
    };

    /**
     * Draw the glowing blue orb at the center
     */
    function drawOrb(time) {
        const pulseScale = 1 + Math.sin(time * 0.003) * 0.12;
        const orbRadius = 18 * pulseScale;

        // Outer glow layers
        for (let i = 3; i >= 0; i--) {
            const r = orbRadius * (2.5 + i * 1.2);
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(30, 120, 255, ${0.06 - i * 0.012})`);
            grad.addColorStop(1, 'rgba(30, 120, 255, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Main glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbRadius * 2.5);
        glow.addColorStop(0, colors.orbGlow);
        glow.addColorStop(0.5, 'rgba(0, 150, 255, 0.15)');
        glow.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, orbRadius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core orb
        const coreGrad = ctx.createRadialGradient(cx - orbRadius * 0.25, cy - orbRadius * 0.25, orbRadius * 0.1, cx, cy, orbRadius);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.2, '#80d0ff');
        coreGrad.addColorStop(0.5, colors.orbCore);
        coreGrad.addColorStop(1, '#0044aa');
        ctx.beginPath();
        ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Shine highlight
        const shineGrad = ctx.createRadialGradient(cx - orbRadius * 0.3, cy - orbRadius * 0.3, 0, cx - orbRadius * 0.2, cy - orbRadius * 0.2, orbRadius * 0.6);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = shineGrad;
        ctx.fill();
    }

    /**
     * Calculate snake segment positions along the circular orbit
     */
    function getSnakePositions(headAngle) {
        const positions = [];
        for (let i = 0; i < segmentCount; i++) {
            // Each segment is spaced angularly behind the head
            const segAngle = headAngle - (i * segmentSpacing / orbitRadius);
            // Add subtle wobble for organic feel
            const wobble = Math.sin(headAngle * 4 + i * 0.4) * 2.5;
            const r = orbitRadius + wobble;
            positions.push({
                x: cx + Math.cos(segAngle) * r,
                y: cy + Math.sin(segAngle) * r,
                angle: segAngle,
                r: r
            });
        }
        return positions;
    }

    /**
     * Draw a single metallic body segment
     */
    function drawSegment(x, y, segAngle, segSize, index, time) {
        const progress = 1 - (index / segmentCount);
        const actualSize = segSize * (0.5 + progress * 0.5);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(segAngle + Math.PI / 2);

        // Main segment body - rounded rectangle shape
        const w = actualSize * 2;
        const h = actualSize * 1.5;

        // Metallic gradient
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, colors.bodyHighlight);
        grad.addColorStop(0.3, colors.bodyLight);
        grad.addColorStop(0.6, colors.bodyMid);
        grad.addColorStop(1, colors.bodyDark);

        // Draw rounded segment
        ctx.beginPath();
        const cornerR = actualSize * 0.4;
        roundedRect(ctx, -w / 2, -h / 2, w, h, cornerR);
        ctx.fillStyle = grad;
        ctx.fill();

        // Edge highlight
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Joint connectors (ring pattern between segments)
        if (index % 2 === 0 && index > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, actualSize * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = colors.jointDark;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, actualSize * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = colors.jointLight;
            ctx.fill();
        }

        // Glowing accent line on every 3rd segment
        if (index % 3 === 0 && index > 0) {
            const glowIntensity = 0.4 + Math.sin(time * 0.005 + index) * 0.3;
            ctx.beginPath();
            ctx.moveTo(-w / 2 + 2, 0);
            ctx.lineTo(w / 2 - 2, 0);
            ctx.strokeStyle = `rgba(0, 204, 255, ${glowIntensity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Metallic rivet dots
        if (index > 0 && index < segmentCount - 1) {
            const rivetAlpha = 0.3 + Math.sin(time * 0.003 + index * 0.5) * 0.15;
            ctx.beginPath();
            ctx.arc(-w / 3, 0, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 230, 255, ${rivetAlpha})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(w / 3, 0, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 230, 255, ${rivetAlpha})`;
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw the robot snake head
     */
    function drawHead(x, y, headAngle, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(headAngle);

        const hs = headSize;

        // Head glow
        const headGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, hs * 2.5);
        headGlow.addColorStop(0, 'rgba(0, 180, 255, 0.15)');
        headGlow.addColorStop(1, 'rgba(0, 180, 255, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, hs * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = headGlow;
        ctx.fill();

        // Head body - elongated shape pointing forward
        ctx.beginPath();
        ctx.ellipse(0, 0, hs * 1.6, hs * 1.1, 0, 0, Math.PI * 2);
        const headGrad = ctx.createLinearGradient(-hs, -hs, hs, hs);
        headGrad.addColorStop(0, colors.bodyHighlight);
        headGrad.addColorStop(0.3, colors.bodyLight);
        headGrad.addColorStop(0.7, colors.bodyMid);
        headGrad.addColorStop(1, colors.bodyDark);
        ctx.fillStyle = headGrad;
        ctx.fill();

        // Head outline
        ctx.strokeStyle = 'rgba(150, 210, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Front visor / mouth plate
        ctx.beginPath();
        ctx.ellipse(hs * 0.5, 0, hs * 0.5, hs * 0.7, 0, -Math.PI / 2, Math.PI / 2);
        ctx.fillStyle = 'rgba(0, 50, 100, 0.4)';
        ctx.fill();

        // Eyes
        const eyeX = hs * 0.4;
        const eyeY1 = -hs * 0.45;
        const eyeY2 = hs * 0.45;
        const eyeR = hs * 0.25;

        // Eye glow
        const eyeGlowIntensity = 0.5 + Math.sin(time * 0.004) * 0.3;

        // Eye 1
        const eg1 = ctx.createRadialGradient(eyeX, eyeY1, 0, eyeX, eyeY1, eyeR * 3);
        eg1.addColorStop(0, `rgba(0, 238, 255, ${eyeGlowIntensity})`);
        eg1.addColorStop(1, 'rgba(0, 238, 255, 0)');
        ctx.beginPath();
        ctx.arc(eyeX, eyeY1, eyeR * 3, 0, Math.PI * 2);
        ctx.fillStyle = eg1;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeX, eyeY1, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = colors.eyeColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeX + eyeR * 0.2, eyeY1 - eyeR * 0.1, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Eye 2
        const eg2 = ctx.createRadialGradient(eyeX, eyeY2, 0, eyeX, eyeY2, eyeR * 3);
        eg2.addColorStop(0, `rgba(0, 238, 255, ${eyeGlowIntensity})`);
        eg2.addColorStop(1, 'rgba(0, 238, 255, 0)');
        ctx.beginPath();
        ctx.arc(eyeX, eyeY2, eyeR * 3, 0, Math.PI * 2);
        ctx.fillStyle = eg2;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeX, eyeY2, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = colors.eyeColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeX + eyeR * 0.2, eyeY2 - eyeR * 0.1, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Antennae
        const antLen = hs * 0.7;
        ctx.beginPath();
        ctx.moveTo(hs * 0.3, -hs * 0.8);
        ctx.lineTo(hs * 0.5, -hs * 0.8 - antLen * 0.4);
        ctx.strokeStyle = colors.bodyMid;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Antenna tip glow
        const antTipGlow = 0.5 + Math.sin(time * 0.006) * 0.4;
        ctx.beginPath();
        ctx.arc(hs * 0.5, -hs * 0.8 - antLen * 0.4, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 238, 255, ${antTipGlow})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(hs * 0.3, hs * 0.8);
        ctx.lineTo(hs * 0.5, hs * 0.8 + antLen * 0.4);
        ctx.strokeStyle = colors.bodyMid;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(hs * 0.5, hs * 0.8 + antLen * 0.4, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 238, 255, ${antTipGlow})`;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw the tail segment with spark effect
     */
    function drawTail(x, y, segAngle, time) {
        const tailSize = segmentBaseSize * 0.3;

        ctx.save();
        ctx.translate(x, y);

        // Tail spark
        const sparkPhase = Math.sin(time * 0.01);
        if (sparkPhase > 0) {
            const sparkGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, tailSize * 4);
            sparkGrad.addColorStop(0, `rgba(0, 204, 255, ${sparkPhase * 0.6})`);
            sparkGrad.addColorStop(1, 'rgba(0, 204, 255, 0)');
            ctx.beginPath();
            ctx.arc(0, 0, tailSize * 4, 0, Math.PI * 2);
            ctx.fillStyle = sparkGrad;
            ctx.fill();
        }

        // Tail tip
        ctx.beginPath();
        ctx.arc(0, 0, tailSize, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw energy trail behind the snake
     */
    function drawEnergyTrail(positions, time) {
        if (positions.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(positions[0].x, positions[0].y);

        for (let i = 1; i < positions.length; i++) {
            ctx.lineTo(positions[i].x, positions[i].y);
        }

        const trailAlpha = 0.08 + Math.sin(time * 0.002) * 0.04;
        ctx.strokeStyle = `rgba(0, 180, 255, ${trailAlpha})`;
        ctx.lineWidth = segmentBaseSize * 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    /**
     * Draw orbit ring (subtle guide)
     */
    function drawOrbitRing(time) {
        const ringAlpha = 0.06 + Math.sin(time * 0.001) * 0.03;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 150, 255, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * Rounded rectangle helper
     */
    function roundedRect(context, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
    }

    /**
     * Main animation loop
     */
    function animate(time) {
        ctx.clearRect(0, 0, size, size);

        // Advance snake position
        angle += snakeSpeed;

        // Draw orbit ring
        drawOrbitRing(time);

        // Draw the orb at center
        drawOrb(time);

        // Calculate snake positions
        const positions = getSnakePositions(angle);

        // Draw energy trail
        drawEnergyTrail(positions, time);

        // Draw body segments (back to front)
        for (let i = positions.length - 1; i >= 1; i--) {
            const pos = positions[i];
            const segAngle = pos.angle;
            drawSegment(pos.x, pos.y, segAngle, segmentBaseSize, i, time);
        }

        // Draw tail
        const tail = positions[positions.length - 1];
        drawTail(tail.x, tail.y, tail.angle, time);

        // Draw head
        const head = positions[0];
        drawHead(head.x, head.y, head.angle, time);

        // Check if loading screen is still visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && loadingScreen.style.visibility !== 'hidden') {
            animationId = requestAnimationFrame(animate);
        } else {
            // Stop animation when loading screen is hidden
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
    }

    // Start animation
    animationId = requestAnimationFrame(animate);
})();
