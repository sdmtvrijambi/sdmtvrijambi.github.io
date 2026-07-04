/**
 * Robot Snake Animation - Small robot snakes chasing circles
 */

(function() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize canvas to fill parent
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ============================================
    // CHASE TARGET CIRCLES (bouncing orbs)
    // ============================================
    class Circle {
        constructor() {
            this.radius = 6 + Math.random() * 8;
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 2.5;
            this.vy = (Math.random() - 0.5) * 2.5;
            this.hue = Math.random() * 360;
            this.pulsePhase = Math.random() * Math.PI * 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.pulsePhase += 0.05;

            // Bounce off edges
            if (this.x < this.radius || this.x > canvas.width - this.radius) {
                this.vx *= -1;
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            }
            if (this.y < this.radius || this.y > canvas.height - this.radius) {
                this.vy *= -1;
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            }
        }

        draw() {
            const pulse = 1 + Math.sin(this.pulsePhase) * 0.3;
            const r = this.radius * pulse;

            // Outer glow
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 3);
            glow.addColorStop(0, `hsla(${this.hue}, 80%, 65%, 0.25)`);
            glow.addColorStop(1, `hsla(${this.hue}, 80%, 65%, 0)`);
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 3, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();

            // Core circle
            const grad = ctx.createRadialGradient(this.x - r * 0.3, this.y - r * 0.3, r * 0.1, this.x, this.y, r);
            grad.addColorStop(0, `hsla(${this.hue}, 90%, 75%, 0.7)`);
            grad.addColorStop(1, `hsla(${this.hue}, 70%, 50%, 0.4)`);
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Inner ring
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${this.hue}, 100%, 80%, 0.5)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // ============================================
    // ROBOT SNAKE
    // ============================================
    class RobotSnake {
        constructor() {
            this.segmentCount = 12 + Math.floor(Math.random() * 6);
            this.segmentSize = 4 + Math.random() * 3;
            this.spacing = this.segmentSize * 1.3;
            this.speed = 1.2 + Math.random() * 1.0;
            this.turnSpeed = 0.08 + Math.random() * 0.04;

            // Start position
            this.segments = [];
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            const startAngle = Math.random() * Math.PI * 2;

            for (let i = 0; i < this.segmentCount; i++) {
                this.segments.push({
                    x: startX - Math.cos(startAngle) * i * this.spacing,
                    y: startY - Math.sin(startAngle) * i * this.spacing
                });
            }

            this.angle = startAngle;
            this.targetCircle = null;

            // Robotic color scheme
            const schemes = [
                { body: '#3b82f6', accent: '#60a5fa', eye: '#00ff88', glow: 'rgba(59,130,246,0.3)' },
                { body: '#06b6d4', accent: '#22d3ee', eye: '#ff6b6b', glow: 'rgba(6,182,212,0.3)' },
                { body: '#8b5cf6', accent: '#a78bfa', eye: '#fbbf24', glow: 'rgba(139,92,246,0.3)' },
                { body: '#10b981', accent: '#34d399', eye: '#f472b6', glow: 'rgba(16,185,129,0.3)' },
                { body: '#f59e0b', accent: '#fbbf24', eye: '#06b6d4', glow: 'rgba(245,158,11,0.3)' }
            ];
            this.colors = schemes[Math.floor(Math.random() * schemes.length)];
            this.wigglePhase = Math.random() * Math.PI * 2;
        }

        findTarget(circles) {
            let closest = null;
            let closestDist = Infinity;
            const head = this.segments[0];

            for (const c of circles) {
                const dx = c.x - head.x;
                const dy = c.y - head.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = c;
                }
            }
            this.targetCircle = closest;
        }

        update() {
            this.wigglePhase += 0.12;

            if (this.targetCircle) {
                const head = this.segments[0];
                const dx = this.targetCircle.x - head.x;
                const dy = this.targetCircle.y - head.y;
                const targetAngle = Math.atan2(dy, dx);

                // Smooth turn toward target
                let angleDiff = targetAngle - this.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                this.angle += angleDiff * this.turnSpeed;
            }

            // Add wiggle for organic movement
            const wiggle = Math.sin(this.wigglePhase) * 0.15;
            const moveAngle = this.angle + wiggle;

            // Move head
            this.segments[0].x += Math.cos(moveAngle) * this.speed;
            this.segments[0].y += Math.sin(moveAngle) * this.speed;

            // Wrap around screen edges
            const head = this.segments[0];
            if (head.x < -50) head.x = canvas.width + 50;
            if (head.x > canvas.width + 50) head.x = -50;
            if (head.y < -50) head.y = canvas.height + 50;
            if (head.y > canvas.height + 50) head.y = -50;

            // Each segment follows the one before it
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dx = prev.x - curr.x;
                const dy = prev.y - curr.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > this.spacing) {
                    const moveRatio = (dist - this.spacing) / dist;
                    curr.x += dx * moveRatio;
                    curr.y += dy * moveRatio;
                }
            }
        }

        draw() {
            const segments = this.segments;

            // Draw trail glow
            ctx.beginPath();
            ctx.moveTo(segments[0].x, segments[0].y);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x, segments[i].y);
            }
            ctx.strokeStyle = this.colors.glow;
            ctx.lineWidth = this.segmentSize * 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Draw body segments (back to front)
            for (let i = segments.length - 1; i >= 1; i--) {
                const seg = segments[i];
                const progress = 1 - (i / segments.length);
                const size = this.segmentSize * (0.4 + progress * 0.6);

                // Segment body
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, size, 0, Math.PI * 2);

                // Metallic gradient
                const grad = ctx.createRadialGradient(
                    seg.x - size * 0.3, seg.y - size * 0.3, size * 0.1,
                    seg.x, seg.y, size
                );
                grad.addColorStop(0, this.colors.accent);
                grad.addColorStop(0.7, this.colors.body);
                grad.addColorStop(1, '#1e293b');
                ctx.fillStyle = grad;
                ctx.fill();

                // Circuit line pattern on every other segment
                if (i % 2 === 0 && i < segments.length - 1) {
                    const next = segments[i + 1];
                    ctx.beginPath();
                    ctx.moveTo(seg.x, seg.y);
                    ctx.lineTo(
                        (seg.x + next.x) / 2,
                        (seg.y + next.y) / 2
                    );
                    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }

                // Joint dots
                if (i > 0 && i < segments.length - 1) {
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, size * 0.25, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fill();
                }
            }

            // Draw head (first segment)
            const head = segments[0];
            const headSize = this.segmentSize * 1.3;
            const headAngle = this.angle;

            // Head shape
            ctx.save();
            ctx.translate(head.x, head.y);
            ctx.rotate(headAngle);

            // Robotic head
            ctx.beginPath();
            ctx.ellipse(0, 0, headSize * 1.4, headSize, 0, 0, Math.PI * 2);
            const headGrad = ctx.createRadialGradient(-headSize * 0.3, -headSize * 0.2, 0, 0, 0, headSize * 1.4);
            headGrad.addColorStop(0, this.colors.accent);
            headGrad.addColorStop(0.6, this.colors.body);
            headGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = headGrad;
            ctx.fill();

            // Antenna nubs
            ctx.beginPath();
            ctx.arc(headSize * 0.6, -headSize * 0.7, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.eye;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(headSize * 0.6, headSize * 0.7, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.eye;
            ctx.fill();

            // Eyes (glowing)
            const eyeX = headSize * 0.5;
            const eyeY1 = -headSize * 0.35;
            const eyeY2 = headSize * 0.35;
            const eyeR = headSize * 0.22;

            // Eye glow
            const eyeGlow1 = ctx.createRadialGradient(eyeX, eyeY1, 0, eyeX, eyeY1, eyeR * 3);
            eyeGlow1.addColorStop(0, this.colors.eye);
            eyeGlow1.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(eyeX, eyeY1, eyeR * 3, 0, Math.PI * 2);
            ctx.fillStyle = eyeGlow1;
            ctx.globalAlpha = 0.4;
            ctx.fill();
            ctx.globalAlpha = 1;

            const eyeGlow2 = ctx.createRadialGradient(eyeX, eyeY2, 0, eyeX, eyeY2, eyeR * 3);
            eyeGlow2.addColorStop(0, this.colors.eye);
            eyeGlow2.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(eyeX, eyeY2, eyeR * 3, 0, Math.PI * 2);
            ctx.fillStyle = eyeGlow2;
            ctx.globalAlpha = 0.4;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Eye cores
            ctx.beginPath();
            ctx.arc(eyeX, eyeY1, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.eye;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eyeX, eyeY2, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.eye;
            ctx.fill();

            // Eye pupils
            ctx.beginPath();
            ctx.arc(eyeX + eyeR * 0.3, eyeY1, eyeR * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eyeX + eyeR * 0.3, eyeY2, eyeR * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();

            ctx.restore();

            // Tail spark (last segment)
            const tail = segments[segments.length - 1];
            const sparkPhase = Date.now() / 200;
            if (Math.sin(sparkPhase) > 0.5) {
                ctx.beginPath();
                ctx.arc(tail.x, tail.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = this.colors.eye;
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }

    // ============================================
    // INITIALIZE ENTITIES
    // ============================================
    const circles = [];
    const snakes = [];

    // Create 8 bouncing circles
    for (let i = 0; i < 8; i++) {
        circles.push(new Circle());
    }

    // Create 4 robot snakes
    for (let i = 0; i < 4; i++) {
        snakes.push(new RobotSnake());
    }

    // ============================================
    // ANIMATION LOOP (with visibility optimization)
    // ============================================
    let isRunning = true;

    function animate() {
        if (!isRunning) return;

        // Skip heavy rendering when tab is hidden (save CPU/battery)
        if (document.hidden) {
            requestAnimationFrame(animate);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw circles
        for (const circle of circles) {
            circle.update();
            circle.draw();
        }

        // Update and draw snakes
        for (const snake of snakes) {
            snake.findTarget(circles);
            snake.update();
            snake.draw();
        }

        requestAnimationFrame(animate);
    }

    // Pause/resume on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isRunning) {
            requestAnimationFrame(animate);
        }
    });

    animate();
})();
