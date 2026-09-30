/*
 * physics.js — small, stable circle physics for the merge jar.
 *
 * Position-based dynamics with sub-steps:
 *   1. integrate gravity and velocity (remembering the previous position)
 *   2. push overlapping circles apart (weighted by inverse mass) and clamp to the walls/floor
 *   3. derive velocity from the corrected positions, then apply restitution, friction,
 *      damping and a speed clamp at the velocity level
 * Positions can never leave the jar (walls are hard clamps), so small fast bodies
 * cannot tunnel, and piles settle instead of jittering.
 * Units: world units (the jar is `right - left` units wide), seconds.
 */
(function () {
  'use strict';

  var G = window.__GAME__;
  var MAX_CONTACTS = 4096;
  var nextId = 1;

  function World(opts) {
    this.bodies = [];
    this.merges = [];         // pairs [a, b] of same-tier bodies that touched this step
    this.mergeEnabled = true;
    this.left = 0;
    this.right = 400;
    this.floor = 520;
    this.configure(opts || {});
    this.cI = new Int32Array(MAX_CONTACTS);
    this.cJ = new Int32Array(MAX_CONTACTS);
    this.cNx = new Float64Array(MAX_CONTACTS);
    this.cNy = new Float64Array(MAX_CONTACTS);
    this.nContacts = 0;
  }

  // opts: { left, right, floor, gravity, substeps, iterations, airDamping, friction,
  //         restitution, maxSpeed, restSpeed, growTime } — speeds/gravity already in world units.
  World.prototype.configure = function (o) {
    var keys = ['left', 'right', 'floor', 'gravity', 'substeps', 'iterations', 'airDamping', 'friction',
      'restitution', 'maxSpeed', 'restSpeed', 'growTime'];
    for (var i = 0; i < keys.length; i++) if (o[keys[i]] != null) this[keys[i]] = o[keys[i]];
    if (!this.substeps) this.substeps = 4;
    if (!this.iterations) this.iterations = 2;
  };

  World.prototype.add = function (tier, radius, x, y, vx, vy, growFrom) {
    var b = {
      id: nextId++,
      tier: tier,
      R: radius,                               // full radius
      r: radius * (growFrom == null ? 1 : growFrom), // current physical radius (grows after a merge)
      growFrom: growFrom == null ? 1 : growFrom,
      grow: growFrom == null || growFrom >= 1 ? 1 : 0,
      im: 1 / (radius * radius),               // inverse mass (mass ∝ r²)
      x: x, y: y, vx: vx || 0, vy: vy || 0,
      px: x, py: y, ovx: 0, ovy: 0,
      angle: 0, spin: 0,
      age: 0,
      contact: false,
      impact: 0,
      merged: false,
      dead: false
    };
    this.bodies.push(b);
    return b;
  };

  World.prototype.clear = function () {
    this.bodies.length = 0;
    this.merges.length = 0;
  };

  World.prototype.removeDead = function () {
    var list = this.bodies, w = 0;
    for (var i = 0; i < list.length; i++) if (!list[i].dead) list[w++] = list[i];
    list.length = w;
  };

  World.prototype.addContact = function (i, j, nx, ny) {
    var k = this.nContacts;
    if (k >= MAX_CONTACTS) return;
    this.cI[k] = i;
    this.cJ[k] = j;
    this.cNx[k] = nx;
    this.cNy[k] = ny;
    this.nContacts = k + 1;
  };

  // Push every body within `radius` of (x, y) outward.
  World.prototype.blast = function (x, y, radius, strength) {
    var list = this.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var dx = b.x - x, dy = b.y - y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > radius + b.R) continue;
      var f = strength * (1 - Math.min(1, d / (radius + b.R)));
      b.vx += (dx / d) * f;
      b.vy += (dy / d) * f - f * 0.3;
    }
  };

  World.prototype.solvePositions = function (record) {
    var list = this.bodies, n = list.length;
    var left = this.left, right = this.right, floor = this.floor;
    for (var i = 0; i < n; i++) {
      var a = list[i];
      for (var j = i + 1; j < n; j++) {
        var b = list[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var rr = a.r + b.r;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        var d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        var d = Math.sqrt(d2);
        var nx, ny;
        if (d < 1e-6) { nx = 0; ny = 1; d = 0; } else { nx = dx / d; ny = dy / d; }
        var pen = rr - d;
        var wsum = a.im + b.im;
        var ca = pen * a.im / wsum, cb = pen * b.im / wsum;
        a.x -= nx * ca; a.y -= ny * ca;
        b.x += nx * cb; b.y += ny * cb;
        if (record) {
          this.addContact(i, j, nx, ny);
          a.contact = b.contact = true;
          if (this.mergeEnabled && a.tier === b.tier && !a.merged && !b.merged) {
            a.merged = b.merged = true;
            this.merges.push([a, b]);
          }
        }
      }
    }
    for (var k = 0; k < n; k++) {
      var c = list[k];
      if (c.x - c.r < left) {
        c.x = left + c.r;
        if (record) { this.addContact(k, -1, 1, 0); c.contact = true; }
      } else if (c.x + c.r > right) {
        c.x = right - c.r;
        if (record) { this.addContact(k, -1, -1, 0); c.contact = true; }
      }
      if (c.y + c.r > floor) {
        c.y = floor - c.r;
        if (record) { this.addContact(k, -1, 0, -1); c.contact = true; }
      }
    }
  };

  World.prototype.solveVelocities = function (h) {
    var list = this.bodies;
    var e = this.restitution;
    var fr = 1 - Math.pow(1 - Math.min(0.99, this.friction), 60 * h); // friction per sub-step
    var bounceMin = this.gravity * h * 4; // ignore tiny approach speeds (resting contact)
    for (var k = 0; k < this.nContacts; k++) {
      var a = list[this.cI[k]];
      var j = this.cJ[k];
      var nx = this.cNx[k], ny = this.cNy[k];
      var vn, vnOld, vt, tx = -ny, ty = nx, imA = a.im, imB, wsum, imp;
      if (j < 0) {
        // static wall/floor; normal points from the wall into the body
        vn = a.vx * nx + a.vy * ny;
        vnOld = a.ovx * nx + a.ovy * ny;
        if (vnOld < -bounceMin) {
          if (-vnOld > a.impact) a.impact = -vnOld;
          var tgt = -e * vnOld;
          if (vn < tgt) { a.vx += nx * (tgt - vn); a.vy += ny * (tgt - vn); }
        }
        vt = a.vx * tx + a.vy * ty;
        a.vx -= tx * vt * fr;
        a.vy -= ty * vt * fr;
        continue;
      }
      var b = list[j];
      imB = b.im;
      wsum = imA + imB;
      // relative velocity of b with respect to a; n points from a to b
      vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      vnOld = (b.ovx - a.ovx) * nx + (b.ovy - a.ovy) * ny;
      if (vnOld < -bounceMin) {
        var sp = -vnOld;
        if (sp > a.impact) a.impact = sp;
        if (sp > b.impact) b.impact = sp;
        var target = -e * vnOld;
        if (vn < target) {
          imp = (target - vn) / wsum;
          a.vx -= nx * imp * imA; a.vy -= ny * imp * imA;
          b.vx += nx * imp * imB; b.vy += ny * imp * imB;
        }
      }
      vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
      imp = vt * fr / wsum;
      a.vx += tx * imp * imA; a.vy += ty * imp * imA;
      b.vx -= tx * imp * imB; b.vy -= ty * imp * imB;
    }
  };

  World.prototype.step = function (dt) {
    var list = this.bodies, n = list.length;
    var subs = this.substeps, h = dt / subs;
    var g = this.gravity, max = this.maxSpeed, max2 = max * max;
    var damp = Math.exp(-this.airDamping * h);
    var rest = this.restSpeed, rest2 = rest * rest;
    var i, b;
    for (i = 0; i < n; i++) {
      b = list[i];
      b.contact = false;
      b.impact = 0;
      b.age += dt;
    }
    for (var s = 0; s < subs; s++) {
      for (i = 0; i < n; i++) {
        b = list[i];
        if (b.grow < 1) {
          b.grow = Math.min(1, b.grow + h / this.growTime);
          var t = 1 - (1 - b.grow) * (1 - b.grow);
          b.r = b.R * (b.growFrom + (1 - b.growFrom) * t);
        }
        b.px = b.x; b.py = b.y;
        b.ovx = b.vx; b.ovy = b.vy;
        b.vy += g * h;
        b.vx *= damp; b.vy *= damp;
        b.x += b.vx * h;
        b.y += b.vy * h;
      }
      this.nContacts = 0;
      for (var it = 0; it < this.iterations; it++) this.solvePositions(it === 0);
      for (i = 0; i < n; i++) {
        b = list[i];
        b.vx = (b.x - b.px) / h;
        b.vy = (b.y - b.py) / h;
      }
      this.solveVelocities(h);
      for (i = 0; i < n; i++) {
        b = list[i];
        var v2 = b.vx * b.vx + b.vy * b.vy;
        if (v2 > max2) {
          var k = max / Math.sqrt(v2);
          b.vx *= k; b.vy *= k;
        } else if (b.contact && v2 < rest2) {
          b.vx *= 0.6; b.vy *= 0.6; // calm resting bodies so piles settle without jitter
        }
        if (b.x !== b.x || b.y !== b.y) { // NaN guard (should never happen)
          b.x = (this.left + this.right) / 2; b.y = this.floor - b.R; b.vx = b.vy = 0;
        }
      }
    }
    // rolling: spin follows the horizontal speed while touching something
    for (i = 0; i < n; i++) {
      b = list[i];
      var target = b.vx / Math.max(1, b.r);
      b.spin += (target - b.spin) * (b.contact ? 0.35 : 0.02);
      b.angle += b.spin * dt;
    }
  };

  G.lib.World = World;
})();
