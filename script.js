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
