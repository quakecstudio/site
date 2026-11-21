// The user guide's progressive enhancement: each page reads fully without it.
(() => {
  "use strict";

  const page = document.querySelector(".docs__page");
  if (!page) return;

  // The nav is a <details open>: closed on narrow screens, where it would push the page down,
  // and open again when the screen widens, where its summary is hidden.
  const nav = document.querySelector(".docs__nav details");
  const narrow = window.matchMedia("(max-width: 48rem)");
  const fitNav = () => {
    if (nav) nav.open = !narrow.matches;
  };
  fitNav();
  narrow.addEventListener("change", fitNav);

  const sections = [...page.querySelectorAll("h2[id]")];

  // An "On this page" list before the first h2, for pages long enough to need one.
  if (sections.length >= 4) {
    const toc = document.createElement("nav");
    toc.className = "docs__toc";
    toc.setAttribute("aria-labelledby", "docs-toc-title");
    const title = document.createElement("p");
    title.id = "docs-toc-title";
    title.textContent = "On this page";
    const list = document.createElement("ol");
    for (const heading of sections) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.append(link);
      list.append(item);
    }
    toc.append(title, list);
    sections[0].before(toc);
  }

  // A "#" link on each h2, to copy a link to that section.
  for (const heading of sections) {
    const anchor = document.createElement("a");
    anchor.className = "docs__anchor";
    anchor.href = `#${heading.id}`;
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", `Link to “${heading.textContent}”`);
    heading.append(anchor);
  }

  // A Copy button on each code block. The clipboard API needs a secure context.
  if (!navigator.clipboard) return;
  for (const pre of page.querySelectorAll("pre")) {
    const box = document.createElement("div");
    box.className = "docs__code";
    pre.before(box);
    box.append(pre);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "docs__copy";
    button.textContent = "Copy";
    button.setAttribute("aria-live", "polite");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText.replace(/\n$/, ""));
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy failed";
      }
      setTimeout(() => {
        button.textContent = "Copy";
      }, 2000);
    });
    box.append(button);
  }
})();
