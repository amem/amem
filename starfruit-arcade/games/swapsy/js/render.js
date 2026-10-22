/*
 * Swapsy — render.js
 * All canvas drawing: background, board, jelly, pieces (pre-rendered sprites with cute faces),
 * special pieces, selection and hints, and effects (beams, shockwaves, rays, particles, texts).
 * To use pictures instead of the drawn pieces, set pieces[].image in config.js; the sprite
 * builder (pieceSprite) draws the image instead of the shape.
 */
(function () {
  'use strict';
  var G = window.__GAME__;
  var M = G.modules;
  var cfg = window.GAME_CONFIG || {};
  var theme = cfg.theme || {};
  var PIECES = cfg.pieces || [];
  var HEADING = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", "Liberation Sans", system-ui, sans-serif';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 1, H = 1, dpr = 1;
  var L = { x: 0, y: 0, tile: 48, rows: 8, cols: 8 };
  var bg = null;
  var sprites = {};
  var images = PIECES.map(function (p) {
    if (!p.image) return null;
    var img = new Image();
    img.onload = function () { sprites = {}; };
    img.src = p.image;
    return img;
  });

  // ---------------------------------------------------------------- colour helpers
  function parse(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    var A = parse(a), B = parse(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function off(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * dpr));
    c.height = Math.max(1, Math.ceil(h * dpr));
    var g = c.getContext('2d');
    g.scale(dpr, dpr);
    return { c: c, g: g };
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // ---------------------------------------------------------------- piece shapes
  function shapePath(g, shape, r) {
    g.beginPath();
    var i, a;
    switch (shape) {
      case 'heart':
        g.moveTo(0, r * 0.85);
        g.bezierCurveTo(-r * 1.15, r * 0.05, -r * 0.9, -r * 0.95, 0, -r * 0.45);
        g.bezierCurveTo(r * 0.9, -r * 0.95, r * 1.15, r * 0.05, 0, r * 0.85);
        break;
      case 'star':
        for (i = 0; i < 10; i++) {
          a = -Math.PI / 2 + i * Math.PI / 5;
          var rr = i % 2 ? r * 0.52 : r * 1.02;
          g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr + r * 0.06);
        }
        g.closePath();
        break;
      case 'leaf':
        g.moveTo(-r * 0.78, r * 0.78);
        g.bezierCurveTo(-r * 0.95, -r * 0.35, -r * 0.3, -r * 0.95, r * 0.82, -r * 0.82);
        g.bezierCurveTo(r * 0.95, r * 0.3, r * 0.35, r * 0.95, -r * 0.78, r * 0.78);
        break;
      case 'drop':
        g.moveTo(0, -r * 1.02);
        g.bezierCurveTo(r * 0.35, -r * 0.5, r * 0.85, -r * 0.05, r * 0.85, r * 0.3);
        g.arc(0, r * 0.3, r * 0.85, 0, Math.PI);
        g.bezierCurveTo(-r * 0.85, -r * 0.05, -r * 0.35, -r * 0.5, 0, -r * 1.02);
        break;
      case 'diamond':
        g.moveTo(0, -r * 0.98);
        g.lineTo(r * 0.92, -r * 0.12);
        g.lineTo(0, r * 0.98);
        g.lineTo(-r * 0.92, -r * 0.12);
        g.closePath();
        break;
      default:
        g.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    }
  }

  function drawFace(g, r) {
    g.fillStyle = '#2b1640';
    g.beginPath(); g.ellipse(-r * 0.24, -r * 0.02, r * 0.08, r * 0.11, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(r * 0.24, -r * 0.02, r * 0.08, r * 0.11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(-r * 0.21, -r * 0.06, r * 0.03, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(r * 0.27, -r * 0.06, r * 0.03, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2b1640';
    g.lineWidth = Math.max(1.2, r * 0.07);
    g.lineCap = 'round';
    g.beginPath(); g.arc(0, r * 0.14, r * 0.15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255, 120, 160, 0.45)';
    g.beginPath(); g.ellipse(-r * 0.42, r * 0.16, r * 0.11, r * 0.07, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(r * 0.42, r * 0.16, r * 0.11, r * 0.07, 0, 0, Math.PI * 2); g.fill();
  }

  function drawBase(g, kind, r) {
    var p = PIECES[kind] || { color: '#999999', shape: 'circle' };
    var img = images[kind];
    if (img && img.complete && img.naturalWidth) {
      g.drawImage(img, -r, -r, r * 2, r * 2);
      return;
    }
    var col = p.color;
    shapePath(g, p.shape, r);
    var grad = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.15);
    grad.addColorStop(0, mix(col, '#ffffff', 0.5));
    grad.addColorStop(0.55, col);
    grad.addColorStop(1, mix(col, '#000000', 0.28));
    g.fillStyle = grad;
    g.fill();
    g.lineWidth = Math.max(1.5, r * 0.08);
    g.strokeStyle = mix(col, '#000000', 0.38);
    g.lineJoin = 'round';
    g.stroke();
    g.save();
    shapePath(g, p.shape, r);
    g.clip();
    g.fillStyle = 'rgba(255, 255, 255, 0.5)';
    g.beginPath();
    g.ellipse(-r * 0.32, -r * 0.48, r * 0.32, r * 0.16, -0.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
    if (cfg.faces !== false) drawFace(g, r);
  }

  function stripes(g, kind, r, vertical) {
    var p = PIECES[kind] || { shape: 'circle' };
    g.save();
    shapePath(g, p.shape, r);
    g.clip();
    g.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (var i = -2; i <= 2; i++) {
      if (vertical) g.fillRect(i * r * 0.42 - r * 0.08, -r, r * 0.16, r * 2);
      else g.fillRect(-r, i * r * 0.42 - r * 0.08, r * 2, r * 0.16);
    }
    g.restore();
    g.fillStyle = '#ffffff';
    var arrow = function (x, y, ang) {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.beginPath(); g.moveTo(r * 0.18, 0); g.lineTo(-r * 0.1, -r * 0.16); g.lineTo(-r * 0.1, r * 0.16); g.closePath();
      g.fill(); g.restore();
    };
    if (vertical) { arrow(0, -r * 1.05, -Math.PI / 2); arrow(0, r * 1.05, Math.PI / 2); }
    else { arrow(-r * 1.05, 0, Math.PI); arrow(r * 1.05, 0, 0); }
  }

  function pieceSprite(kind, special, size) {
    var id = kind + ':' + (special || '') + ':' + size;
    if (sprites[id]) return sprites[id];
    var pad = size * 0.2;
    var o = off(size + pad * 2, size + pad * 2);
    var g = o.g;
    var r = size * 0.42;
    g.translate(pad + size / 2, pad + size / 2);
    g.shadowColor = 'rgba(40, 10, 70, 0.28)';
    g.shadowBlur = size * 0.1;
    g.shadowOffsetY = size * 0.06;
    if (special === 'rainbow') {
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
      g.shadowColor = 'transparent';
      var cols = PIECES.map(function (p) { return p.color; });
      for (var i = 0; i < 12; i++) {
        g.fillStyle = cols[i % cols.length] || '#ff4d6d';
        g.beginPath(); g.moveTo(0, 0);
        g.arc(0, 0, r * 0.94, i * Math.PI / 6, (i + 1) * Math.PI / 6);
        g.closePath(); g.fill();
      }
      var shine = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      shine.addColorStop(0.45, 'rgba(255, 255, 255, 0.25)');
      shine.addColorStop(1, 'rgba(60, 20, 90, 0.35)');
      g.fillStyle = shine;
      g.beginPath(); g.arc(0, 0, r * 0.94, 0, Math.PI * 2); g.fill();
      g.lineWidth = r * 0.1; g.strokeStyle = '#3a1d6e';
      g.beginPath(); g.arc(0, 0, r * 0.98, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ffffff';
      [[-0.45, -0.1, 0.09], [0.35, -0.45, 0.07], [0.3, 0.4, 0.06]].forEach(function (s) {
        g.beginPath(); g.arc(s[0] * r, s[1] * r, s[2] * r, 0, Math.PI * 2); g.fill();
      });
    } else if (special === 'bomb') {
      var col = (PIECES[kind] || {}).color || '#999999';
      g.fillStyle = mix(col, '#000000', 0.2);
      [-1, 1].forEach(function (s) {
        g.beginPath();
        g.moveTo(s * r * 0.55, 0);
        g.lineTo(s * r * 1.12, -r * 0.42);
        g.quadraticCurveTo(s * r * 1.0, 0, s * r * 1.12, r * 0.42);
        g.closePath();
        g.fill();
      });
      g.save();
      g.scale(0.84, 0.84);
      drawBase(g, kind, r);
      g.restore();
      g.shadowColor = 'transparent';
      g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      g.lineWidth = r * 0.1;
      g.setLineDash([r * 0.18, r * 0.14]);
      g.beginPath(); g.arc(0, 0, r * 0.98, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
    } else {
      drawBase(g, kind, r);
      g.shadowColor = 'transparent';
      if (special === 'row') stripes(g, kind, r, false);
      if (special === 'col') stripes(g, kind, r, true);
    }
    o.c.pad = pad;
    o.c.size = size;
    sprites[id] = o.c;
    return o.c;
  }

  /** Small picture of a piece for the HUD (data URL). */
  function icon(kind, px) {
    var save = dpr;
    dpr = 2;
    var c = pieceSprite(kind, null, px);
    dpr = save;
    delete sprites[kind + '::' + px];
    return c.toDataURL();
  }

  // ---------------------------------------------------------------- layout & background
  function resize(w, h, layout) {
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    L = layout;
    sprites = {};
    buildBackground();
  }

  function buildBackground() {
    var o = off(W, H);
    var g = o.g;
    var grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, theme.skyTop || '#ff8fc7');
    grad.addColorStop(1, theme.skyBottom || '#8f6bff');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    var seed = 5;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(255, 255, 255, ' + (0.05 + rnd() * 0.1).toFixed(3) + ')';
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, 8 + rnd() * Math.min(W, H) * 0.09, 0, Math.PI * 2);
      g.fill();
    }
    // Board panel: one rounded tile per cell, merged into the board shape.
    var S = M.view;
    if (S && S.board) {
      var b = S.board, t = L.tile;
      g.save();
      g.shadowColor = 'rgba(50, 10, 90, 0.35)';
      g.shadowBlur = t * 0.4;
      g.shadowOffsetY = t * 0.12;
      g.fillStyle = theme.board || 'rgba(255, 255, 255, 0.72)';
      for (var r = 0; r < b.rows; r++) for (var c = 0; c < b.cols; c++) {
        if (!b.mask[r][c]) continue;
        roundRect(g, L.x + c * t - t * 0.08, L.y + r * t - t * 0.08, t * 1.16, t * 1.16, t * 0.22);
        g.fill();
      }
      g.restore();
      for (r = 0; r < b.rows; r++) for (c = 0; c < b.cols; c++) {
        if (!b.mask[r][c]) continue;
        g.fillStyle = (r + c) % 2 ? (theme.cellB || '#ece2ff') : (theme.cellA || '#f6efff');
        roundRect(g, L.x + c * t + t * 0.04, L.y + r * t + t * 0.04, t * 0.92, t * 0.92, t * 0.16);
        g.fill();
      }
    }
    bg = o.c;
  }

  // ---------------------------------------------------------------- frame
  function cx(c) { return L.x + (c + 0.5) * L.tile; }
  function cy(r) { return L.y + (r + 0.5) * L.tile; }

  function frame(time) {
    var S = M.view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = theme.skyBottom || '#8f6bff';
    ctx.fillRect(0, 0, W, H);
    if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    var b = S.board;
    if (!b) return;
    var t = L.tile;
    // Jelly.
    for (var r = 0; r < b.rows; r++) for (var c = 0; c < b.cols; c++) {
      var j = b.mask[r][c] ? b.jelly[r][c] : 0;
      if (!j) continue;
      ctx.fillStyle = theme.jelly || '#ff6fb5';
      ctx.globalAlpha = j > 1 ? 0.62 : 0.34;
      roundRect(ctx, L.x + c * t + t * 0.07, L.y + r * t + t * 0.07, t * 0.86, t * 0.86, t * 0.18);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, t * 0.04);
      ctx.beginPath();
      ctx.moveTo(L.x + c * t + t * 0.2, L.y + r * t + t * 0.22);
      ctx.lineTo(L.x + c * t + t * 0.45, L.y + r * t + t * 0.22);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Selection, keyboard cursor.
    if (S.selected) ring(S.selected, theme.accent || '#ffd23f', 0.5 + 0.5 * Math.sin(time * 8));
    if (S.cursor && S.showCursor) ring(S.cursor, '#ffffff', 0.9);
    // Pieces.
    ctx.save();
    roundClipBoard();
    var hintIds = S.hint ? S.hint.ids : null;
    for (r = 0; r < b.rows; r++) for (c = 0; c < b.cols; c++) {
      var tile = b.grid[r][c];
      if (tile) drawTile(tile, time, hintIds && hintIds.indexOf(tile.id) >= 0);
    }
    ctx.restore();
    for (var i = 0; i < S.popping.length; i++) drawPop(S.popping[i]);
    drawFx(S, time);
  }

  function roundClipBoard() {
    // Pieces falling in from above stay hidden until they enter the board.
    ctx.beginPath();
    ctx.rect(0, L.y - L.tile * 0.1, W, H);
    ctx.clip();
  }

  function ring(cell, color, alpha) {
    var t = L.tile;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, t * 0.07);
    roundRect(ctx, L.x + cell.c * t + t * 0.05, L.y + cell.r * t + t * 0.05, t * 0.9, t * 0.9, t * 0.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawTile(tile, time, hinted) {
    var t = L.tile;
    var spr = pieceSprite(tile.special === 'rainbow' ? -1 : tile.kind, tile.special, Math.round(t));
    var x = cx(tile.x), y = cy(tile.y);
    var s = 1, rot = 0;
    if (tile.born > 0) s = 1 + Math.sin((1 - tile.born) * Math.PI) * 0.3;
    if (tile.land > 0) s *= 1 - Math.sin(tile.land * Math.PI) * 0.08;
    if (hinted) { rot = Math.sin(time * 18) * 0.14; s *= 1.05; }
    if (tile.special === 'bomb') s *= 1 + Math.sin(time * 6 + tile.id) * 0.04;
    if (tile.special === 'rainbow') rot += time * 1.2;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (tile.land > 0) ctx.scale(1 + tile.land * 0.06, 1 - tile.land * 0.06);
    ctx.scale(s, s);
    var full = spr.size + spr.pad * 2;
    ctx.drawImage(spr, -full / 2, -full / 2, full, full);
    ctx.restore();
  }

  function drawPop(p) {
    var t = L.tile;
    var k = p.t / p.max;
    var spr = pieceSprite(p.tile.special === 'rainbow' ? -1 : p.tile.kind, p.tile.special, Math.round(t));
    var full = spr.size + spr.pad * 2;
    var s = 1 + (1 - k) * 0.45;
    ctx.save();
    ctx.globalAlpha = Math.max(0, k);
    ctx.translate(cx(p.x), cy(p.y));
    ctx.scale(s, s);
    ctx.drawImage(spr, -full / 2, -full / 2, full, full);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawFx(S, time) {
    var t = L.tile;
    var b = S.board;
    S.fx.forEach(function (f) {
      var k = f.t / f.max;
      ctx.globalAlpha = Math.max(0, k);
      if (f.type === 'row' || f.type === 'col') {
        var thick = t * (f.wide ? 2.6 : 0.8) * (0.4 + k * 0.6);
        var grad;
        if (f.type === 'row') {
          grad = ctx.createLinearGradient(0, cy(f.r) - thick / 2, 0, cy(f.r) + thick / 2);
          grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(L.x - t * 0.3, cy(f.r) - thick / 2, b.cols * t + t * 0.6, thick);
        } else {
          grad = ctx.createLinearGradient(cx(f.c) - thick / 2, 0, cx(f.c) + thick / 2, 0);
          grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(cx(f.c) - thick / 2, L.y - t * 0.3, thick, b.rows * t + t * 0.6);
        }
      } else if (f.type === 'bomb') {
        ctx.strokeStyle = theme.accent || '#ffd23f';
        ctx.lineWidth = t * 0.25 * k;
        ctx.beginPath();
        ctx.arc(cx(f.c), cy(f.r), t * (f.size + 1) * (1.2 - k * 0.6) * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.type === 'rainbow') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, t * 0.06);
        (f.targets || []).forEach(function (q) {
          ctx.beginPath();
          ctx.moveTo(cx(f.c), cy(f.r));
          ctx.lineTo(cx(q.c), cy(q.r));
          ctx.stroke();
        });
      }
      ctx.globalAlpha = 1;
    });
    S.particles.forEach(function (p) {
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    S.floaters.forEach(function (f) {
      text(f.text, f.x, f.y, f.size, f.color, Math.min(1, f.life * 2.5));
    });
    if (S.banner) {
      var bn = S.banner;
      var age = bn.max - bn.life;
      var sc = Math.min(1, age * 5);
      sc = 1 + 1.7 * Math.pow(sc - 1, 3) + 0.7 * Math.pow(sc - 1, 2);
      var size = Math.min(W * 0.1, t * 1.1, 64) * sc * (bn.scale || 1);
      if (size > 2) text(bn.text, W / 2, L.y + (b.rows * t) / 2, size, bn.color || '#ffffff', Math.min(1, bn.life * 3), true);
      if (bn.sub && size > 2) text(bn.sub, W / 2, L.y + (b.rows * t) / 2 + size * 1.1, size * 0.45, '#ffffff', Math.min(1, bn.life * 3), true);
    }
  }

  function text(str, x, y, size, color, alpha, outline) {
    ctx.globalAlpha = alpha;
    ctx.font = '800 ' + Math.round(size) + 'px ' + HEADING;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * (outline ? 0.24 : 0.18));
    ctx.strokeStyle = outline ? (theme.ink || '#3a1d6e') : '#ffffff';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.globalAlpha = 1;
  }

  M.render = {
    resize: resize,
    rebuildBoard: buildBackground,
    frame: frame,
    icon: icon,
    cellCenter: function (r, c) { return { x: cx(c), y: cy(r) }; },
    layout: function () { return L; }
  };
})();
