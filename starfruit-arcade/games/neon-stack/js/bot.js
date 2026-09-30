/*
 * bot.js — the demo / attract-mode player.
 * For each new block it picks a target offset (mostly a perfect hit, sometimes
 * slightly off, and eventually a deliberate miss so rounds end with the
 * zoom-out) and "taps" the moment the sliding block crosses that target.
 */
(function () {
  'use strict';
  var NS = window.__GAME__ = window.__GAME__ || {};
  var M = NS.modules = NS.modules || {};
  var cfg = window.GAME_CONFIG || {};
  var demo = cfg.demo || {};
  var gp = cfg.gameplay || {};
  var B = (cfg.block && cfg.block.size) || 100;
  var TOL = gp.perfectTolerance || 4;
  var RANGE = (gp.slideRange || 1.4) * B;

  var target = 0;
  var passes = 0;
  var prev = null;
  var missAt = 40;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /** New round: decide at which height the bot will slip up. */
  function newRound() {
    var lo = demo.missAfterMin || 28;
    var hi = Math.max(lo, demo.missAfterMax || 60);
    missAt = Math.round(rand(lo, hi));
  }

  /** New sliding block. level = its level, size = its length on the moving axis. */
  function newBlock(level, size) {
    prev = null;
    passes = Math.random() < 0.18 ? 1 : 0;
    var sign = Math.random() < 0.5 ? -1 : 1;
    if (level >= missAt) {
      target = sign * Math.min(RANGE * 0.95, size + B * 0.15);
      passes = 0;
      return;
    }
    var chance = demo.perfectChance == null ? 0.8 : demo.perfectChance;
    if (Math.random() < chance) {
      target = rand(-0.45, 0.45) * TOL;
    } else {
      var lo = TOL * 1.4;
      var hi = Math.max(lo, Math.min(size * 0.3, B * 0.1));
      target = sign * rand(lo, hi);
    }
  }

  /** Called every frame with the block's offset; returns the offset to drop at, or null. */
  function update(pos) {
    var hit = null;
    if (prev !== null && (prev - target) * (pos - target) <= 0 && prev !== pos) {
      if (passes > 0) passes--;
      else hit = target;
    }
    prev = pos;
    return hit;
  }

  M.bot = { newRound: newRound, newBlock: newBlock, update: update };
})();
