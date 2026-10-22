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

    let mapFrame = 0;
    const updateReadingMap = () => {
      mapFrame = 0;
      const marker = window.innerHeight * .32;
      let activeIndex = 0;
      headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top <= marker) activeIndex = index;
      });
      links.forEach((link, index) => link.classList.toggle("is-active", index === activeIndex));
    };
    updateReadingMap();
    window.addEventListener("scroll", () => {
      if (!mapFrame) mapFrame = requestAnimationFrame(updateReadingMap);
    }, { passive: true });
  }
}

const readHistory = getReadHistory();
document.querySelectorAll(".story-card").forEach(card => {
  const link = card.querySelector('a[href^="/blog-"]');
  if (!link) return;
  const path = new URL(link.href, window.location.origin).pathname.replace(/\.html$/, "");
  if (readHistory.has(path)) card.classList.add("is-read");
});

const signalLibrary = [
  { path: "/blog-open-burrow-blueprints", title: "The Burrow is now buildable", deck: "Use MADGER’s public canon, structured data, and blueprint system without confusing worldbuilding with shipped gameplay.", label: "Creator utility", topics: ["utility", "culture", "proof"], image: "/assets/MADGER_World_Bible/v2.0.0/previews/UG-A0.png", alt: "Cross-section blueprint of The Burrow’s connected surface and underground areas" },
  { path: "/blog-mobile-preview-release-status", title: "Playable, proven, not yet in the store: MADGER 1.3.0", deck: "Test the preview, inspect the build evidence, and understand the store boundary.", label: "Release desk", topics: ["proof", "safety", "utility"], image: "/assets/reports/game-upgrade/burrow-gameplay-390.png", alt: "MADGER runs through a glowing three-lane Burrow tunnel" },
  { path: "/blog-circulating-supply-endpoint", title: "A number that can explain itself", deck: "Audit the live supply endpoint, its five locks, and its fail-closed rules.", label: "Proof infrastructure", topics: ["proof", "diligence", "safety"], image: "/assets/madger_fieldnote_foundations_v1.webp", alt: "MADGER measures a durable underground foundation" },
  { path: "/blog-verify-without-social", title: "Verify MADGER without social media", deck: "Recover the official record when a channel disappears or an account changes.", label: "Verification desk", topics: ["safety", "diligence", "proof"], image: "/assets/madger_fieldnote_safety_v1.webp", alt: "MADGER verifies links at a security desk" },
  { path: "/blog-market-cap-is-not-fdv", title: "Market cap is not FDV", deck: "Reproduce a ten-minute supply audit and catch a mislabeled valuation.", label: "Diligence desk", topics: ["diligence", "proof", "safety"], image: "/assets/madger_trading_live_launch_poster_v1.png", alt: "Official MADGER trading-live artwork" },
  { path: "/blog-proof-you-can-open", title: "Proof you can open", deck: "Play, inspect, and challenge the public record behind Burrow Run.", label: "Proof briefing", topics: ["proof", "utility"], image: "/assets/madger_social_share_v10.jpg", alt: "The original MADGER character emerges through glowing Burrow trails" },
  { path: "/blog-utility-without-a-wallet", title: "Utility without a wallet", deck: "Use, verify, and improve The Burrow Commons before buying anything.", label: "Utility briefing", topics: ["utility", "safety"], image: "/assets/madger_v6_community_welcome.webp", alt: "MADGER welcomes people into The Burrow" },
  { path: "/blog-creator-trust-standard", title: "Before the badge", deck: "A six-part standard for safer, clearer creator relationships.", label: "Creator trust", topics: ["utility", "safety", "culture"], image: "/assets/madger_journal_writer_v3.webp", alt: "MADGER writes a dispatch at the Signal Desk" },
  { path: "/blog-madger-thesis", title: "The MADGER thesis", deck: "Evaluate a strategy built around identity, evidence, distribution, and execution.", label: "Investor briefing", topics: ["diligence", "proof", "culture"], image: "/assets/madger_v6_community_welcome.webp", alt: "MADGER steps forward from The Burrow" },
  { path: "/blog-diligence-map", title: "How to evaluate MADGER", deck: "Separate what is verifiable now from what still carries execution risk.", label: "Diligence desk", topics: ["diligence", "proof", "safety"], image: "/assets/madger_trading_live_launch_poster_v1.png", alt: "Official MADGER trading-live artwork" },
  { path: "/blog-burrow-after-launch", title: "The Burrow after launch", deck: "A practical operating doctrine for turning a launch into useful momentum.", label: "Project intelligence", topics: ["utility", "culture"], image: "/assets/madger_hero_burrow_v7.jpg", alt: "MADGER stands inside the illuminated Burrow" },
  { path: "/blog-character-outlives-chart", title: "A character can outlive a chart", deck: "Why original identity gives a project something price action cannot manufacture.", label: "Character files", topics: ["culture"], image: "/assets/madger_social_share_v10.jpg", alt: "The original MADGER character emerges through glowing Burrow trails" },
  { path: "/blog-verify-live-market", title: "How to verify a live Solana market", deck: "Move from official mint to pool without trusting a ticker or a direct message.", label: "Market fieldcraft", topics: ["safety", "diligence"], image: "/assets/madger_trading_live_launch_poster_v1.png", alt: "Official MADGER trading-live artwork with verified project branding" },
  { path: "/blog-building-foundations", title: "Why MADGER is building the boring parts first", deck: "See why a trustworthy public home comes before spectacle.", label: "Project notes", topics: ["proof", "utility"], image: "/assets/madger_fieldnote_foundations_v1.webp", alt: "MADGER measures plans for a durable tunnel foundation" },
  { path: "/blog-honey-badger-standard", title: "The Honey Badger standard", deck: "The resilience, skepticism, and loyalty behind MADGER decisions.", label: "Burrow culture", topics: ["culture"], image: "/assets/madger_fieldnote_standard_v1.webp", alt: "MADGER holds a field lantern at the threshold of a stormy tunnel" },
  { path: "/blog-token-link-safety", title: "Seven checks before you trust a token link", deck: "Reject copycats, fake support, and rushed decisions with a repeatable checklist.", label: "Crypto safety", topics: ["safety", "diligence"], image: "/assets/madger_fieldnote_safety_v1.webp", alt: "MADGER inspects links with a magnifying glass at a security desk" }
];

const normalizeSignalPath = value => new URL(value, window.location.origin).pathname.replace(/\.html$/, "");
const signalByPath = new Map(signalLibrary.map(signal => [signal.path, signal]));
const archiveGrid = document.querySelector(".notes .card-grid");

if (archiveGrid) {
  const cards = [...archiveGrid.querySelectorAll(".story-card")];
  const filterButtons = [...document.querySelectorAll(".signal-filter[data-topic]")];
  const searchInput = document.querySelector("#signal-search");
  const unreadInput = document.querySelector("#unread-only");
  const clearButton = document.querySelector("#clear-signal-filters");
  const status = document.querySelector("#archive-status");
  const empty = document.querySelector("#archive-empty");
  const validTopics = new Set(filterButtons.map(button => button.dataset.topic));
  const params = new URLSearchParams(window.location.search);
  let activeTopic = validTopics.has(params.get("topic")) ? params.get("topic") : "all";

  cards.forEach(card => {
    const href = card.querySelector('a[href^="/blog-"]')?.href;
    const signal = href ? signalByPath.get(normalizeSignalPath(href)) : null;
    card.dataset.topics = signal?.topics.join(" ") || "";
    card.dataset.search = `${signal?.title || ""} ${signal?.deck || ""} ${signal?.label || ""} ${card.textContent}`.toLowerCase();
  });

  if (searchInput) searchInput.value = params.get("q") || "";
  if (unreadInput) unreadInput.checked = params.get("unread") === "1";

  const applyArchiveFilters = () => {
    const query = searchInput?.value.trim().toLowerCase() || "";
    const unreadOnly = Boolean(unreadInput?.checked);
    let visibleCount = 0;

    cards.forEach(card => {
      const topicMatch = activeTopic === "all" || card.dataset.topics.split(" ").includes(activeTopic);
      const searchMatch = !query || card.dataset.search.includes(query);
      const unreadMatch = !unreadOnly || !card.classList.contains("is-read");
      const visible = topicMatch && searchMatch && unreadMatch;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    filterButtons.forEach(button => {
      const selected = button.dataset.topic === activeTopic;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    archiveGrid.classList.toggle("is-filtered", activeTopic !== "all" || Boolean(query) || unreadOnly);
    if (empty) empty.hidden = visibleCount !== 0;
    if (clearButton) clearButton.hidden = activeTopic === "all" && !query && !unreadOnly;
    if (status) {
      const qualifier = activeTopic === "all" ? "" : ` in ${filterButtons.find(button => button.dataset.topic === activeTopic)?.querySelector("strong")?.textContent || activeTopic}`;
      status.textContent = `Showing ${visibleCount} of ${cards.length} dispatches${qualifier}.`;
    }

    const nextParams = new URLSearchParams(window.location.search);
    activeTopic === "all" ? nextParams.delete("topic") : nextParams.set("topic", activeTopic);
    query ? nextParams.set("q", query) : nextParams.delete("q");
    unreadOnly ? nextParams.set("unread", "1") : nextParams.delete("unread");
    const nextUrl = `${window.location.pathname}${nextParams.size ? `?${nextParams}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  };

  filterButtons.forEach(button => button.addEventListener("click", () => {
    activeTopic = button.dataset.topic;
    applyArchiveFilters();
  }));
  searchInput?.addEventListener("input", applyArchiveFilters);
  unreadInput?.addEventListener("change", applyArchiveFilters);
  clearButton?.addEventListener("click", () => {
    activeTopic = "all";
    if (searchInput) searchInput.value = "";
    if (unreadInput) unreadInput.checked = false;
    applyArchiveFilters();
    searchInput?.focus();
  });
  applyArchiveFilters();
}

if (articleBody) {
  const currentPath = normalizeSignalPath(window.location.pathname);
  const currentSignal = signalByPath.get(currentPath);
  const footerNav = document.querySelector(".article-footer-nav");

  if (currentSignal && footerNav) {
    const recommendations = signalLibrary
      .filter(signal => signal.path !== currentSignal.path)
      .map((signal, index) => ({ signal, score: signal.topics.filter(topic => currentSignal.topics.includes(topic)).length * 100 - index }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.signal);

    const section = document.createElement("section");
    section.className = "related-signals";
    section.setAttribute("aria-labelledby", "related-signals-title");

    const heading = document.createElement("div");
    heading.className = "related-signals-heading";
    const headingCopy = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Continue this trail";
    const title = document.createElement("h2");
    title.id = "related-signals-title";
    title.textContent = "THREE USEFUL NEXT SIGNALS.";
    const explanation = document.createElement("p");
    explanation.textContent = "Chosen by shared subject—not by price, promotion, or urgency.";
    headingCopy.append(eyebrow, title);
    heading.append(headingCopy, explanation);

    const grid = document.createElement("div");
    grid.className = "related-signals-grid";
    recommendations.forEach(signal => {
      const link = document.createElement("a");
      link.className = "related-signal-card";
      link.href = `${signal.path}.html`;
      if (readHistory.has(signal.path)) link.classList.add("is-read");
      const image = document.createElement("img");
      image.src = signal.image;
      image.alt = signal.alt;
      image.loading = "lazy";
      const copy = document.createElement("span");
      const label = document.createElement("small");
      label.textContent = signal.label;
      const cardTitle = document.createElement("strong");
      cardTitle.textContent = signal.title;
      const deck = document.createElement("em");
      deck.textContent = signal.deck;
      const cta = document.createElement("b");
      cta.textContent = "OPEN SIGNAL ↗";
      copy.append(label, cardTitle, deck, cta);
      link.append(image, copy);
      grid.append(link);
    });

    section.append(heading, grid);
    footerNav.before(section);
  }
}
