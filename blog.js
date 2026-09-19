const journalRoot = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const updateProgress = () => {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  journalRoot.style.setProperty("--journal-progress", `${available > 0 ? (window.scrollY / available) * 100 : 0}%`);
};

updateProgress();
window.addEventListener("scroll", updateProgress, { passive: true });

if (!reduceMotion) {
  window.addEventListener("pointermove", event => {
    journalRoot.style.setProperty("--journal-x", `${event.clientX}px`);
    journalRoot.style.setProperty("--journal-y", `${event.clientY}px`);
    const hero = document.querySelector(".hero-art-v2 img");
    if (hero && window.innerWidth > 760) {
      const x = (event.clientX / window.innerWidth - .5) * 10;
      const y = (event.clientY / window.innerHeight - .5) * 7;
      hero.style.setProperty("--hero-x", `${x}px`);
      hero.style.setProperty("--hero-y", `${y}px`);
    }
  }, { passive: true });

  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("pointermove", event => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      card.style.setProperty("--tilt-y", `${x * 3.5}deg`);
      card.style.setProperty("--tilt-x", `${y * -3.5}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--tilt-x", "0deg");
    });
  });
}

const revealNodes = document.querySelectorAll("[data-reveal]");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealNodes.forEach(node => node.classList.add("is-revealed"));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08 });
  revealNodes.forEach(node => observer.observe(node));
}

const articleBody = document.querySelector(".article-body");
const readHistoryKey = "madger-signals-read";

const getReadHistory = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(readHistoryKey) || "[]"));
  } catch {
    return new Set();
  }
};

if (articleBody) {
  const readHistory = getReadHistory();
  readHistory.add(window.location.pathname.replace(/\.html$/, ""));
  try {
    localStorage.setItem(readHistoryKey, JSON.stringify([...readHistory].slice(-50)));
  } catch {
    // Reading history is an optional, local-only enhancement.
  }

  const headings = [...articleBody.querySelectorAll("h2")];
  if (headings.length >= 3) {
    const readingMap = document.createElement("nav");
    readingMap.className = "reading-map";
    readingMap.setAttribute("aria-label", "On this dispatch");
    const label = document.createElement("span");
    label.textContent = "IN THIS DISPATCH";
    readingMap.append(label);

    const links = headings.map((heading, index) => {
      heading.id ||= `signal-section-${index + 1}`;
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      readingMap.append(link);
      return link;
    });
    document.body.append(readingMap);

    if ("IntersectionObserver" in window) {
      const sectionObserver = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        links.forEach(link => link.classList.toggle("is-active", link.hash === `#${visible.target.id}`));
      }, { rootMargin: "-18% 0px -68%", threshold: 0 });
      headings.forEach(heading => sectionObserver.observe(heading));
    }
  }
}

const readHistory = getReadHistory();
document.querySelectorAll(".story-card").forEach(card => {
  const link = card.querySelector('a[href^="/blog-"]');
  if (!link) return;
  const path = new URL(link.href, window.location.origin).pathname.replace(/\.html$/, "");
  if (readHistory.has(path)) card.classList.add("is-read");
});
