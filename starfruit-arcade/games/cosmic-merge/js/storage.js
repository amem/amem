/*
 * storage.js — safe localStorage wrapper.
 * Falls back to an in-memory store when storage is blocked (private mode, sandboxed iframes).
 * Also creates the window.__GAME__ namespace; internal modules register on __GAME__.lib.
 */
(function () {
  'use strict';

  var G = window.__GAME__ = window.__GAME__ || {};
  G.id = 'cosmic-merge';
  G.version = '1.0.0';
  G.lib = G.lib || {}; // internal module registry (not part of the public test API)

  var cfg = window.GAME_CONFIG || {};
  var prefix = (cfg.storageKey || G.id) + ':';
  var memory = {};
  var ls = null;

  try {
    ls = window.localStorage;
    var probe = prefix + '__probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch (e) {
    ls = null;
  }

  function get(key, fallback) {
    var raw = null;
    try {
      raw = ls ? ls.getItem(prefix + key) : (key in memory ? memory[key] : null);
    } catch (e) {
      raw = key in memory ? memory[key] : null;
    }
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    var raw = JSON.stringify(value);
    memory[key] = raw;
    try {
      if (ls) ls.setItem(prefix + key, raw);
    } catch (e) { /* quota or blocked: memory copy is kept */ }
  }

  G.lib.storage = { get: get, set: set };
})();
