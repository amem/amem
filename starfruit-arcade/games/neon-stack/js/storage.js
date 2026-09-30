/*
 * storage.js — safe localStorage wrapper.
 * Private browsing, sandboxed iframes and file:// can all throw on access;
 * every call is wrapped and falls back to an in-memory store.
 */
(function () {
  'use strict';
  var NS = window.__GAME__ = window.__GAME__ || {};
  var M = NS.modules = NS.modules || {};
  var cfg = window.GAME_CONFIG || {};
  var prefix = (cfg.storageKey || 'neon-stack') + ':';
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
    if (ls) {
      try { raw = ls.getItem(prefix + key); } catch (e) { raw = null; }
    }
    if (raw === null && Object.prototype.hasOwnProperty.call(memory, key)) raw = memory[key];
    if (raw === null || raw === undefined) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function set(key, value) {
    var raw = JSON.stringify(value);
    memory[key] = raw;
    if (ls) {
      try { ls.setItem(prefix + key, raw); } catch (e) { /* quota / denied: memory copy is kept */ }
    }
  }

  M.storage = { get: get, set: set };
})();
