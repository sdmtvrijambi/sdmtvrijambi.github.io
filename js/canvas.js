/**
 * Cyber-Organic Canvas Background (UI/UX Pro Max)
 * Features 90/45 degree orthogonal circuit lines, comet data bursts,
 * dynamic HUD radar sweeps, floating technical telemetry micro-logs, and smooth mouse parallax.
 */

(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let nodes = [];
  let connections = [];
  let comets = [];
  let radarRings = [];
  let telemetryLogs = [];

  const TELEMETRY_SNIPPETS = [
    '[SYS_ONLINE]', '0x8F3C92', 'AUTH_KEY::OK', 'LAT: 12ms',
    'GAS_API_SYNC', 'PORT_8080::LISTEN', 'NIP_INDEX_READY', 'DB_MUTATION_OK',
    'CYBER_NODE_04', 'PACKET_DECRYPT', 'FLOW_RATE: 99.8%'
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initNetwork();
  }

  function initNetwork() {
    nodes = [];
    connections = [];
    comets = [];
    radarRings = [];
    telemetryLogs = [];

    // Create a grid-aligned node network for 90/45 degree connections
    const columns = Math.floor(width / 180) + 1;
    const rows = Math.floor(height / 180) + 1;

    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        // Add subtle random jitter off grid
        const x = i * 180 + (Math.random() * 40 - 20);
        const y = j * 180 + (Math.random() * 40 - 20);
        const isCoreNode = Math.random() > 0.7;
        
        nodes.push({
          x: x,
          y: y,
          baseX: x,
          baseY: y,
          isCore: isCoreNode,
          pulseAngle: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03
        });
      }
    }

    // Connect nodes orthogonally (90 degree and 45 degree trace lines)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = Math.abs(nodes[i].x - nodes[j].x);
        const dy = Math.abs(nodes[i].y - nodes[j].y);
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);

        // Connect if close enough and strictly orthogonal/diagonal aligned
        if (dist < 260 && (dx < 30 || dy < 30 || Math.abs(dx - dy) < 30)) {
          connections.push({
            from: nodes[i],
            to: nodes[j],
            dx: dx,
            dy: dy
          });
        }
      }
    }

    // Initialize Bioluminescent Data Comets on random connections
    for (let k = 0; k < 18; k++) {
      spawnComet();
    }

    // Initialize Radar Sweeps around core nodes
    for (let r = 0; r < 4; r++) {
      const coreNodes = nodes.filter(n => n.isCore);
      if (coreNodes.length > 0) {
        const targetNode = coreNodes[Math.floor(Math.random() * coreNodes.length)];
        radarRings.push({
          x: targetNode.x,
          y: targetNode.y,
          radius: 10,
          maxRadius: 180 + Math.random() * 120,
          speed: 1 + Math.random() * 1.5,
          opacity: 0.8
        });
      }
    }

    // Initialize Telemetry Micro Logs
    for (let t = 0; t < 8; t++) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      telemetryLogs.push({
        x: randomNode.x + 15,
        y: randomNode.y - 15,
        text: TELEMETRY_SNIPPETS[Math.floor(Math.random() * TELEMETRY_SNIPPETS.length)],
        opacity: Math.random(),
        fadeSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }

  function spawnComet() {
    if (connections.length === 0) return;
    const conn = connections[Math.floor(Math.random() * connections.length)];
    comets.push({
      connection: conn,
      progress: Math.random(),
      speed: 0.003 + Math.random() * 0.006,
      size: 2 + Math.random() * 2,
      color: Math.random() > 0.3 ? '#00F0FF' : '#9D4EDD'
    });
  }

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX - width / 2) * 0.04;
    mouse.targetY = (e.clientY - height / 2) * 0.04;
  });

  function render() {
    // Parallax Interpolation (Lerp)
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    ctx.clearRect(0, 0, width, height);

    // Draw Subtle Cyber Background Grid Lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    const offsetX = mouse.x * 0.5;
    const offsetY = mouse.y * 0.5;

    for (let x = offsetX % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Save context for Parallax displacement
    ctx.save();
    ctx.translate(mouse.x, mouse.y);

    // 1. Draw Orthogonal Connection Traces (90° and 45° paths)
    ctx.lineWidth = 1;
    for (let i = 0; i < connections.length; i++) {
      const { from, to, dx, dy } = connections[i];
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);

      // Route orthogonally: first horizontal/vertical, then diagonal
      if (dx > dy) {
        ctx.lineTo(to.x, from.y);
      } else {
        ctx.lineTo(from.x, to.y);
      }
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    // 2. Draw Bioluminescent Data Comets (with glowing gradient tail)
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.progress += c.speed;

      if (c.progress >= 1) {
        comets.splice(i, 1);
        spawnComet();
        continue;
      }

      const { from, to, dx, dy } = c.connection;
      let curX, curY, prevX, prevY;

      const midX = dx > dy ? to.x : from.x;
      const midY = dx > dy ? from.y : to.y;

      if (c.progress < 0.5) {
        const t = c.progress * 2;
        curX = from.x + (midX - from.x) * t;
        curY = from.y + (midY - from.y) * t;
      } else {
        const t = (c.progress - 0.5) * 2;
        curX = midX + (to.x - midX) * t;
        curY = midY + (to.y - midY) * t;
      }

      // Draw glowing comet head & tail
      const gradient = ctx.createRadialGradient(curX, curY, 0, curX, curY, c.size * 5);
      gradient.addColorStop(0, c.color);
      gradient.addColorStop(0.4, c.color === '#00F0FF' ? 'rgba(0, 240, 255, 0.4)' : 'rgba(157, 78, 221, 0.4)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(curX, curY, c.size * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Nodes (Reactor Dots)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.pulseAngle += n.pulseSpeed;
      const pulseScale = Math.sin(n.pulseAngle) * 0.3 + 1;

      if (n.isCore) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3 * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 8 * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Draw Radar Sweeps (Expanding HUD circles)
    for (let i = 0; i < radarRings.length; i++) {
      const ring = radarRings[i];
      ring.radius += ring.speed;
      ring.opacity = 1 - (ring.radius / ring.maxRadius);

      if (ring.radius >= ring.maxRadius) {
        ring.radius = 5;
        ring.opacity = 0.8;
      }

      ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, ring.opacity * 0.3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Draw Floating Telemetry Micro-Logs
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let i = 0; i < telemetryLogs.length; i++) {
      const log = telemetryLogs[i];
      log.opacity += log.fadeSpeed;
      if (log.opacity > 0.85 || log.opacity < 0.1) {
        log.fadeSpeed = -log.fadeSpeed;
      }
      ctx.fillStyle = `rgba(0, 240, 255, ${Math.max(0, log.opacity * 0.4)})`;
      ctx.fillText(log.text, log.x, log.y);
    }

    ctx.restore();
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  render();
})();
