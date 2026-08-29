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
