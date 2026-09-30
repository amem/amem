/*
 * Brick Blitz — storage.js
 * Safe localStorage wrapper: every access is wrapped in try/catch and falls back to
 * an in-memory store (private mode, sandboxed iframes, file:// with storage disabled).
 * Also creates the private module namespace shared by the other scripts.
 */
(function () {
  'use strict';

  var api = window.__GAME__ || (window.__GAME__ = {});
  if (!api._m) Object.defineProperty(api, '_m', { value: {}, enumerable: false });

  var PREFIX = 'brick-blitz:';
  var memory = {};
  var ls = null;
  try {
    ls = window.localStorage;
    ls.setItem(PREFIX + 'probe', '1');
    ls.removeItem(PREFIX + 'probe');
  } catch (e) {
    ls = null;
  }

  function get(key, fallback) {
    var raw = null;
    try {
      raw = ls ? ls.getItem(PREFIX + key) : null;
    } catch (e) {
      raw = null;
    }
    if (raw === null || raw === undefined) raw = memory.hasOwnProperty(key) ? memory[key] : null;
    if (raw === null) return fallback;
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
      if (ls) ls.setItem(PREFIX + key, raw);
    } catch (e) { /* quota / privacy mode: memory copy is enough */ }
  }

  api._m.storage = { get: get, set: set };
})();
