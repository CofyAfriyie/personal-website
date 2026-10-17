const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
const year = document.querySelector('[data-year]');
document.documentElement.classList.add('js');

year.textContent = new Date().getFullYear();

const setHeaderState = () => header.classList.toggle('scrolled', window.scrollY > 12);
setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  menuToggle.querySelector('.sr-only').textContent = open ? 'Open navigation' : 'Close navigation';
  nav.classList.toggle('open', !open);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.querySelector('.sr-only').textContent = 'Open navigation';
    menuToggle.focus();
  }
});

nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.querySelector('.sr-only').textContent = 'Open navigation';
  }
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach((item) => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
}

/* In-page anchors. Some embedded viewers (iframe/sandbox, different base URL) do not scroll
   for plain "#id" links, so scroll the target ourselves. Without JS the anchors still work. */
(() => {
  const lastSeg = (path) => (path.split('/').pop() || 'index.html');
  const dirOf = (path) => path.replace(/[^/]*$/, '');
  const closeMenu = () => {
    if (!nav.classList.contains('open')) return;
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.querySelector('.sr-only').textContent = 'Open navigation';
  };
  const sameDoc = (href) => {
    if (href.charAt(0) === '#') return href.slice(1);
    let u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    if (!u.hash || u.hash.length < 2) return null;
    if (u.protocol !== location.protocol || u.host !== location.host) return null;
    if (dirOf(u.pathname) !== dirOf(location.pathname) || lastSeg(u.pathname) !== lastSeg(location.pathname)) return null;
    return u.hash.slice(1);
  };
  const scrollToId = (id, smooth) => {
    let target = null;
    try { target = document.getElementById(decodeURIComponent(id)); } catch (e) { target = document.getElementById(id); }
    if (!target) return false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'instant', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    return true;
  };
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = event.target.closest && event.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const id = sameDoc(a.getAttribute('href'));
    if (!id) return;
    if (!document.getElementById(id)) return;
    event.preventDefault();
    closeMenu();
    scrollToId(id, true);
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed viewer: ignore */ }
  });
  /* Arriving with a hash (for example from a Back fallback): make sure the section is shown. */
  window.addEventListener('load', () => {
    if (location.hash.length > 1) scrollToId(location.hash.slice(1), false);
  });
})();

/* Back link on sub-pages: if the visitor came from another page of this site, go back in
   history so the browser restores the exact scroll position; otherwise follow the href. */
(() => {
  const dirOf = (path) => path.replace(/[^/]*$/, '');
  const cameFromThisSite = () => {
    if (!document.referrer || history.length < 2) return false;
    try {
      const r = new URL(document.referrer);
      return r.protocol === location.protocol && r.host === location.host &&
        dirOf(r.pathname) === dirOf(location.pathname) && r.pathname !== location.pathname;
    } catch (e) { return false; }
  };
  document.querySelectorAll('a[data-back]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (cameFromThisSite()) {
        event.preventDefault();
        history.back();
      }
    });
  });
})();

/* Read more (phone only, max-width 700px). Progressive enhancement: every [data-readmore] block is complete in the HTML and fully
   visible without JavaScript. On a phone this adds a class that clips the block to about two lines (the text stays in the DOM and
   is read in full by assistive technology) and a real <button> that expands it in place. Nothing is removed or hidden with display:none. */
(() => {
  const mq = window.matchMedia('(max-width: 700px)');
  const blocks = [...document.querySelectorAll('[data-readmore]')];
  if (!blocks.length) return;
  const root = document.documentElement;
  let uid = 0;
  const nameFor = (el) => {
    const host = el.closest('article, aside, .bt, section') || el.parentElement;
    let h = host && host.querySelector('h2, h3');
    if (!h) { const sec = el.closest('section'); h = sec && sec.querySelector('h2'); }
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
  };
  const setup = (el) => {
    if (el.dataset.rmReady) return;
    if (!el.id) el.id = 'rm-' + (++uid);
    el.classList.add('rm-collapsed');
    if (el.scrollHeight <= el.clientHeight + 2) { el.classList.remove('rm-collapsed'); return; }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rm-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', el.id);
    const label = el.dataset.rmLabel || 'Read more';
    const who = nameFor(el);
    const paint = (open) => {
      btn.textContent = open ? 'Show less' : label;
      if (who) { const s = document.createElement('span'); s.className = 'sr-only'; s.textContent = ' about ' + who; btn.appendChild(s); }
      btn.setAttribute('aria-expanded', String(open));
    };
    paint(false);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      el.classList.toggle('rm-collapsed', !open);
      paint(open);
    });
    el.after(btn);
    el.dataset.rmReady = '1';
  };
  const teardown = (el) => {
    el.classList.remove('rm-collapsed');
    delete el.dataset.rmReady;
    const b = el.nextElementSibling;
    if (b && b.classList.contains('rm-btn')) b.remove();
  };
  const apply = () => {
    root.classList.toggle('rm-on', mq.matches);
    blocks.forEach(mq.matches ? setup : teardown);
  };
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
  window.addEventListener('load', () => { if (mq.matches) { blocks.forEach(teardown); apply(); } });
})();

/* Phone: the hero slideshow keeps one stable height (the tallest slide) so controls and content below do not jump. QA round 10 change: the builder's version
   followed the slide on show (jumps of about 190 px). Without JavaScript, or above 700px, nothing changes. */
(() => {
  const track = document.querySelector('.slideshow .slides');
  if (!track) return;
  const mq = window.matchMedia('(max-width: 700px)');
  const fit = () => {
    if (!mq.matches) { track.style.height = ''; return; }
    /* QA fix: one stable height (the tallest slide) so the arrows, dots and everything below never jump when the slide changes. */
    const tallest = Math.max(...[...track.children].map((s) => s.offsetHeight));
    if (tallest > 0) track.style.height = tallest + 'px';
  };
  const watch = () => {
    if (!('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(fit);
    [...track.children].forEach((s) => ro.observe(s));
  };
  new MutationObserver(fit).observe(track, { attributes: true, subtree: true, attributeFilter: ['inert', 'hidden'] });
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  mq.addEventListener && mq.addEventListener('change', fit);
  watch();
  fit();
})();
