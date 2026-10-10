// highlight.js: colours Pun code in every <pre class="code"> on the page.
// The server sends plain text; this runs in the browser after the page loads.

(function () {
  'use strict';

  var TOKENS = new RegExp([
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)',                                   // 1 comment
    '("(?:\\\\.|[^"\\\\])*")',                                                  // 2 string
    '\\b(je|nahi_ta|jad_tak|har_ik|vich|kaam|wapas|dasso|sach|jhooth|khali)\\b', // 3 keyword
    '\\b(mang|jawab|soochi|shabdkosh|jatha|bhandar)\\b',                        // 4 built-in
    '\\b(\\d+(?:\\.\\d+)?)\\b'                                                  // 5 number
  ].join('|'), 'g');
  var CLASSES = [null, 'c', 's', 'k', 'b', 'n'];

  function highlight(pre) {
    var text = pre.textContent;
    var out = document.createDocumentFragment();
    var last = 0;
    text.replace(TOKENS, function (match) {
      var groups = Array.prototype.slice.call(arguments, 1, 6);
      var offset = arguments[6];
      out.appendChild(document.createTextNode(text.slice(last, offset)));
      var span = document.createElement('span');
      span.className = CLASSES[groups.findIndex(function (g) { return g !== undefined; }) + 1];
      span.textContent = match;
      out.appendChild(span);
      last = offset + match.length;
      return match;
    });
    out.appendChild(document.createTextNode(text.slice(last)));
    pre.textContent = '';
    pre.appendChild(out);
  }

  document.querySelectorAll('pre.code').forEach(highlight);
})();
