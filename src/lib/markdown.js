import { marked } from "marked";

// Configure marked for chat: GitHub-ish breaks, no header IDs.
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

// Minimal, dependency-free HTML sanitizer. We only render model output, but we
// still strip script/style/event handlers and dangerous URIs defensively.
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];
  const nodes = [];
  let n = walker.nextNode();
  while (n) {
    nodes.push(n);
    n = walker.nextNode();
  }
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object" || tag === "embed") {
      toRemove.push(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && val.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    }
    // Force links to open safely in a new tab.
    if (tag === "a") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
  toRemove.forEach((el) => el.remove());
  return doc;
}

const COPY_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

const PREVIEW_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>';

// Languages that name browser-runnable markup outright.
const PREVIEW_LANGS = new Set(["html", "htm", "xml", "svg"]);
// Strong signal that unlabeled code is really HTML we can render.
const HTML_MARKER =
  /<(!doctype|html|head|body|svg|div|section|main|table|h[1-6]|p|a|img|button|ul|ol)[\s>]/i;

// True when a code block can be rendered in a browser iframe. Named markup langs
// always qualify; unlabeled/text blocks qualify only if they look like HTML.
function isPreviewableLang(lang, codeText) {
  if (PREVIEW_LANGS.has(lang)) return true;
  if (lang && lang !== "text") return false;
  return HTML_MARKER.test(codeText || "");
}

// Wrap each <pre> code block with a header bar carrying a language label and a
// copy button (plus a preview button for browser-runnable code). The buttons are
// inert HTML; Message.jsx wires up clicks via delegation.
function enhanceCodeBlocks(doc) {
  const pres = Array.from(doc.body.querySelectorAll("pre"));
  for (const pre of pres) {
    if (pre.parentElement?.classList.contains("code-block")) continue;
    const code = pre.querySelector("code");
    const cls = code?.getAttribute("class") || "";
    const m = cls.match(/language-([\w+-]+)/i);
    const lang = m ? m[1] : "text";

    const wrap = doc.createElement("div");
    wrap.className = "code-block";

    const head = doc.createElement("div");
    head.className = "code-block__head";
    const preview = isPreviewableLang(lang, code?.textContent)
      ? `<button type="button" class="code-preview" aria-label="Preview in browser">${PREVIEW_SVG}<span>Preview</span></button>`
      : "";
    head.innerHTML =
      `<span class="code-block__lang">${lang}</span>` +
      `<span class="code-block__actions">${preview}` +
      `<button type="button" class="code-copy" aria-label="Copy code">${COPY_SVG}<span>Copy</span></button>` +
      `</span>`;

    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(head);
    wrap.appendChild(pre);
  }
  return doc;
}

export function renderMarkdown(text) {
  try {
    const doc = enhanceCodeBlocks(sanitize(marked.parse(text || "")));
    return doc.body.innerHTML;
  } catch {
    // Fall back to escaped plain text on any parser error.
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }
}
