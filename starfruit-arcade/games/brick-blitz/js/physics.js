/*
 * Brick Blitz — physics.js
 * Playfield layout constants and pure collision / prediction helpers.
 * All numbers are logical pixels of the fixed 640 × 960 playfield.
 */
(function () {
  'use strict';

  var M = window.__GAME__._m;

  var layout = {
    W: 640,            // playfield width
    H: 960,            // playfield height
    hudH: 88,          // HUD strip at the top of the playfield
    left: 20,          // inner edge of the left wall
    right: 620,        // inner edge of the right wall
    top: 104,          // inner edge of the top wall
    cols: 12,          // brick columns
    maxRows: 14,       // tallest level supported
    gridX: 20,         // left of brick column 0
    gridY: 150,        // top of brick row 0
    cellW: 50,         // brick cell size (brick is drawn inset by `inset`)
    cellH: 26,
    inset: 2,
    paddleY: 872       // top edge of the paddle
  };

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  /**
   * Circle vs axis-aligned rectangle.
   * Returns true on overlap and fills `out` with the push-out normal (nx, ny),
   * the penetration depth and whether the contact is on a corner.
   */
  function circleRect(cx, cy, r, rx, ry, rw, rh, out) {
    var px = clamp(cx, rx, rx + rw);
    var py = clamp(cy, ry, ry + rh);
    var dx = cx - px;
    var dy = cy - py;
    var d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;
    if (d2 > 1e-9) {
      var d = Math.sqrt(d2);
      out.nx = dx / d;
      out.ny = dy / d;
      out.pen = r - d;
      out.corner = px !== cx && py !== cy;
      out.d2 = d2;
      out.sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      out.sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      return true;
    }
    // Centre inside the rectangle: push out along the axis of least penetration.
    var l = cx - rx, rr = rx + rw - cx, t = cy - ry, b = ry + rh - cy;
    var m = Math.min(l, rr, t, b);
    out.nx = m === l ? -1 : m === rr ? 1 : 0;
    out.ny = out.nx !== 0 ? 0 : m === t ? -1 : 1;
    out.pen = m + r;
    out.corner = false;
    out.d2 = 0;
    out.sx = out.nx;
    out.sy = out.ny;
    return true;
  }

  /** Reflect a unit direction on a normal (only when moving into the surface). */
  function reflect(ball, nx, ny) {
    var dot = ball.dx * nx + ball.dy * ny;
    if (dot >= 0) return false;
    ball.dx -= 2 * dot * nx;
    ball.dy -= 2 * dot * ny;
    normalize(ball);
    return true;
  }

  function normalize(ball) {
    var len = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) || 1;
    ball.dx /= len;
    ball.dy /= len;
  }

  /** Keep the direction at least `minDeg` away from horizontal. */
  function enforceAngle(ball, minDeg) {
    var s = Math.sin(minDeg * Math.PI / 180);
    if (Math.abs(ball.dy) < s) {
      var sy = ball.dy < 0 ? -1 : ball.dy > 0 ? 1 : -1;
      var sx = ball.dx < 0 ? -1 : 1;
      ball.dy = sy * s;
      ball.dx = sx * Math.sqrt(1 - s * s);
    }
  }

  /** Rotate a ball direction by `rad`. */
  function rotate(ball, rad) {
    var c = Math.cos(rad), s = Math.sin(rad);
    var x = ball.dx * c - ball.dy * s;
    ball.dy = ball.dx * s + ball.dy * c;
    ball.dx = x;
    normalize(ball);
  }

  /**
   * Predict the x where a ball moving along (dx, dy) reaches `targetY`,
   * bouncing off the side walls (bricks ignored). Returns null when not descending.
   */
  function predictX(x, y, dx, dy, targetY, lo, hi) {
    if (dy <= 0.0001) return null;
    var t = (targetY - y) / dy;
    var px = x + dx * t;
    var span = hi - lo;
    if (span <= 0) return lo;
    var u = (px - lo) % (2 * span);
    if (u < 0) u += 2 * span;
    return lo + (u > span ? 2 * span - u : u);
  }

  M.physics = {
    layout: layout,
    clamp: clamp,
    circleRect: circleRect,
    reflect: reflect,
    normalize: normalize,
    enforceAngle: enforceAngle,
    rotate: rotate,
    predictX: predictX
  };
})();
