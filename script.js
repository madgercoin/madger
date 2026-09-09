const moods = [
  ["Still standing.", "Markets change. Madger doesn't."],
  ["Not impressed.", "Another prediction. Cool."],
  ["Coffee helped.", "Barely."],
  ["About time.", "Green candles should not be this surprising."],
  ["Read first.", "Verify the contract before touching anything."],
  ["Burrow mode.", "Build quietly. Let the work make noise."],
  ["Unbothered.", "Volatility is loud. Bedrock isn't."]
];

const day = Math.floor(Date.now() / 86400000);
const [mood, quote] = moods[day % moods.length];
const moodNode = document.querySelector("#mood");
const quoteNode = document.querySelector("#quote");
const yearNode = document.querySelector("#year");
if (moodNode) moodNode.textContent = mood;
if (quoteNode) quoteNode.textContent = quote;
if (yearNode) yearNode.textContent = new Date().getFullYear();

const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector("#main-nav");
menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
nav?.addEventListener("click", event => {
  if (event.target.matches("a")) {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});

// The active creator contest is additive: preserve every existing homepage section
// and place one prominent, removable campaign surface ahead of the core content.
(() => {
  const main = document.querySelector("main#main");
  if (!main || document.getElementById("video-contest-banner")) return;

  const style = document.createElement("style");
  style.textContent = `
    .contest-home-banner{position:relative;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(260px,.52fr);gap:32px;align-items:center;margin:76px auto 0;max-width:1280px;padding:34px;border:1px solid rgba(212,175,55,.5);border-radius:28px;background:radial-gradient(circle at 88% 12%,rgba(212,175,55,.22),transparent 35%),linear-gradient(135deg,#11110f,#080908);box-shadow:0 24px 70px rgba(0,0,0,.38);overflow:hidden}.contest-home-banner::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.035),transparent 58%)}.contest-home-copy{position:relative;z-index:1}.contest-home-kicker{display:flex;align-items:center;gap:9px;margin:0 0 12px;color:#f2d06b;font-size:.72rem;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.contest-home-kicker i{width:9px;height:9px;border-radius:50%;background:#f0bb45;box-shadow:0 0 18px rgba(240,187,69,.8)}.contest-home-banner h2{margin:0;font-family:Impact,Haettenschweiler,"Arial Narrow Bold",sans-serif;font-size:clamp(2.6rem,6vw,5.7rem);line-height:.88;text-transform:uppercase}.contest-home-banner h2 span{color:#d4af37}.contest-home-lede{max-width:760px;margin:18px 0;color:var(--muted,#b9b2a5);font-size:1.08rem}.contest-home-facts{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 22px}.contest-home-facts span{padding:9px 12px;border:1px solid rgba(212,175,55,.28);border-radius:999px;background:rgba(0,0,0,.24);font-weight:850;color:#f4efe5}.contest-home-actions{display:flex;gap:12px;flex-wrap:wrap}.contest-home-poster{position:relative;z-index:1}.contest-home-poster a{display:block}.contest-home-poster img{display:block;width:100%;height:auto;border-radius:18px;border:1px solid rgba(212,175,55,.45);box-shadow:0 20px 45px rgba(0,0,0,.42)}.contest-home-caption{display:block;margin-top:9px;color:#d9cda9;font-size:.76rem;text-align:center}.contest-nav-link{color:#f2d06b!important;font-weight:900!important}.contest-home-deadline{font-weight:900;color:#f2d06b}@media(max-width:900px){.contest-home-banner{grid-template-columns:1fr;margin-top:68px}.contest-home-poster{max-width:520px;margin:0 auto}.contest-home-banner h2{font-size:clamp(3rem,11vw,5rem)}}@media(max-width:640px){.contest-home-banner{margin:66px 14px 0;padding:22px;border-radius:20px}.contest-home-facts span{font-size:.82rem}.contest-home-actions .button{width:100%;text-align:center;justify-content:center}}
  `;
  document.head.appendChild(style);

  const banner = document.createElement("section");
  banner.id = "video-contest-banner";
  banner.className = "contest-home-banner";
  banner.setAttribute("aria-labelledby", "video-contest-banner-title");
  banner.innerHTML = `
    <div class="contest-home-copy">
      <p class="contest-home-kicker"><i aria-hidden="true"></i> VIDEO CREATION CONTEST · OPEN NOW</p>
      <h2 id="video-contest-banner-title">CREATE MADGER.<br><span>WIN $MADGER.</span></h2>
      <p class="contest-home-lede">The official MADGER Video Creation Contest is live. Create an original video for any public platform, use the current official MADGER likeness plus the required intro and outro, post with <strong>#MadgerMeme</strong>, and submit the original file through MADGERCOIN.COM.</p>
      <div class="contest-home-facts"><span>$120 prize pool</span><span>1st place: $50</span><span>Top 10 win</span><span>Ends Sep 22 · 11:59 PM ET</span></div>
      <div class="contest-home-actions"><a class="button primary" href="/video-contest.html#entry">Enter the Contest →</a><a class="button secondary" href="/video-contest-rules.html">Official Rules</a></div>
      <p class="contest-home-deadline">Winners announced by September 25, 2026.</p>
    </div>
    <div class="contest-home-poster"><a href="/video-contest.html" aria-label="Open MADGER Video Creation Contest"><img src="/assets/madger_video_creation_contest_poster.svg" width="600" height="750" alt="Official MADGER Video Creation Contest poster showing a $120 prize pool and $50 first prize"></a><span class="contest-home-caption">Tap the poster for contest details, official resources, and submission.</span></div>`;
  main.insertBefore(banner, main.firstChild);

  if (nav && !nav.querySelector('a[href="/video-contest.html"]')) {
    const contestLink = document.createElement("a");
    contestLink.href = "/video-contest.html";
    contestLink.textContent = "Video Contest";
    contestLink.className = "contest-nav-link";
    const cta = nav.querySelector(".nav-cta");
    nav.insertBefore(contestLink, cta || null);
  }
})();

const copyButton = document.querySelector("[data-copy-target]");
const copyStatus = document.querySelector(".copy-status");
copyButton?.addEventListener("click", async () => {
  const address = document.querySelector(`#${copyButton.dataset.copyTarget}`).textContent;
  try {
    await navigator.clipboard.writeText(address);
    copyStatus.textContent = "Official mint address copied.";
  } catch {
    copyStatus.textContent = "Copy unavailable. Select and copy the address above.";
  }
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

if (!reducedMotion) {
  window.addEventListener("pointermove", event => {
    root.style.setProperty("--mouse-x", `${event.clientX}px`);
    root.style.setProperty("--mouse-y", `${event.clientY}px`);
  }, { passive: true });
}

const updateScrollProgress = () => {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty("--scroll", `${available > 0 ? (window.scrollY / available) * 100 : 0}%`);
};
updateScrollProgress();
window.addEventListener("scroll", updateScrollProgress, { passive: true });

const revealNodes = document.querySelectorAll(".reveal");
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealNodes.forEach(node => node.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  revealNodes.forEach(node => observer.observe(node));
}

if (!reducedMotion) {
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("pointermove", event => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      card.style.setProperty("--ry", `${x * 7}deg`);
      card.style.setProperty("--rx", `${y * -7}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    });
  });
}
