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
  return doc.body.innerHTML;
}

export function renderMarkdown(text) {
  try {
    return sanitize(marked.parse(text || ""));
  } catch {
    // Fall back to escaped plain text on any parser error.
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }
}
