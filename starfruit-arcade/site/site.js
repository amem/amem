// Wires the links from site.config.js into the page and handles the copy button.
(function () {
  'use strict';
  var config = window.SITE_CONFIG || { links: {}, products: {} };

  function lookup(key) {
    var parts = key.split(':');
    if (parts[0] === 'product') {
      var product = (config.products || {})[parts[1]] || {};
      return product[parts[2]] || '';
    }
    return (config.links || {})[key] || '';
  }

  document.querySelectorAll('[data-link]').forEach(function (el) {
    var url = lookup(el.getAttribute('data-link'));
    if (url) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
    } else if (el.hasAttribute('data-fallback')) {
      el.href = el.getAttribute('data-fallback');
    } else {
      el.hidden = true;
    }
  });

  // Price rows: show "Coming soon" when no store link is configured yet.
  document.querySelectorAll('.buy').forEach(function (group) {
    var visible = group.querySelectorAll('[data-link]:not([hidden])').length;
    var soon = group.querySelector('.soon');
    if (soon) soon.hidden = visible > 0;
  });

  var toast = document.querySelector('.toast');
  var toastTimer;
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 1800);
  }

  var email = (config.links || {}).email || '';
  var emailBox = document.querySelector('[data-email]');
  if (email && emailBox) {
    emailBox.hidden = false;
    emailBox.querySelector('[data-email-text]').textContent = email;
    emailBox.querySelector('[data-copy-email]').addEventListener('click', function () {
      var done = function () { showToast('Email copied'); };
      var fallback = function () {
        var range = document.createRange();
        range.selectNodeContents(emailBox.querySelector('[data-email-text]'));
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        showToast('Press Ctrl+C to copy');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, fallback);
      } else {
        fallback();
      }
    });
  }

  var channels = document.querySelector('.channels');
  if (channels) {
    var anyChannel = channels.querySelectorAll('[data-link]:not([hidden])').length > 0 || !!email;
    document.querySelector('[data-channels-empty]').hidden = anyChannel;
  }
})();
