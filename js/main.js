/* ============================================================
   Riley Link — Personal Website JavaScript
   ============================================================ */

(() => {
  'use strict';

  // ───────────────────────────────
  // 1. Dark Mode Toggle
  // ───────────────────────────────

  const html = document.documentElement;
  // Support both landing page (themeToggle) and blog page (theme-toggle) IDs
  const themeToggle = document.getElementById('themeToggle') || document.getElementById('theme-toggle');
  const iconSun = themeToggle?.querySelector('.icon-sun');
  const iconMoon = themeToggle?.querySelector('.icon-moon');

  /** Apply a theme and persist to localStorage */
  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
  }

  /** Swap sun/moon icon visibility */
  function updateThemeIcon(theme) {
    if (!iconSun || !iconMoon) return;
    if (theme === 'dark') {
      iconSun.style.display = 'block';
      iconMoon.style.display = 'none';
    } else {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block';
    }
  }

  // Initialise theme: localStorage → system preference → light
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }

  initTheme();

  themeToggle?.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });


  // ───────────────────────────────
  // 2. Mobile Navigation
  // ───────────────────────────────

  // Landing page elements
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu?.querySelectorAll('.mobile-menu__link');

  // Blog page elements
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  function openMobileMenu() {
    hamburger?.classList.add('open');
    mobileMenu?.classList.add('open');
    document.body.classList.add('menu-open');
  }

  function closeMobileMenu() {
    hamburger?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu?.classList.contains('open');
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  // Close when a mobile link is clicked
  mobileLinks?.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // Blog page mobile nav toggle
  navToggle?.addEventListener('click', () => {
    navMenu?.classList.toggle('active');
  });

  // Close blog nav when a link is clicked
  navMenu?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu?.classList.remove('active');
    });
  });

  // Close when clicking outside the menu content (on the overlay)
  mobileMenu?.addEventListener('click', (e) => {
    if (e.target === mobileMenu) closeMobileMenu();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      navMenu?.classList.remove('active');
    }
  });


  // ───────────────────────────────
  // 3. Smooth Scroll
  // ───────────────────────────────

  const navHeight = parseInt(getComputedStyle(html).getPropertyValue('--nav-height')) || 64;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return; // skip logo/self-link

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  // ───────────────────────────────
  // 4. Scroll-Triggered Fade-In
  // ───────────────────────────────

  const fadeEls = document.querySelectorAll('.fade-in');

  if (fadeEls.length && 'IntersectionObserver' in window) {
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target); // animate only once
        }
      });
    }, { threshold: 0.1 });

    fadeEls.forEach(el => fadeObserver.observe(el));
  } else {
    // Fallback: show everything immediately
    fadeEls.forEach(el => el.classList.add('visible'));
  }


  // ───────────────────────────────
  // 5. Active Nav Highlighting
  // ───────────────────────────────

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, {
      rootMargin: `-${navHeight + 20}px 0px -40% 0px`,
      threshold: 0,
    });

    sections.forEach(section => navObserver.observe(section));
  }


  // ───────────────────────────────
  // 6. Hero Canvas Animation
  // ───────────────────────────────

  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas?.getContext('2d');

  if (canvas && ctx) {
    const symbols = ['∫', '∮', '∬', '∂', 'Σ', 'π', '∞', 'λ', '∇', 'Δ', 'δ', 'θ', 'α', 'β', 'γ', 'ε', 'ζ', 'η', 'μ', 'ξ', 'ρ', 'σ', 'τ', 'φ', 'ψ', 'ω', 'Ω', 'ℝ', 'ℂ', 'ℤ', 'ℒ', 'ℋ', '≈', '≠', '⊕', '⊗', '∧', '∥', '⊥', '√'];
    const particles = [];
    let animId = null;
    let isVisible = true;

    /** Resize canvas to match container */
    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    /** Create a single floating symbol particle */
    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        size: 14 + Math.random() * 18,
        opacity: 0.04 + Math.random() * 0.05,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.005,
      };
    }

    /** Populate particles based on viewport area */
    function initParticles() {
      particles.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < Math.min(count, 70); i++) {
        particles.push(createParticle());
      }
    }

    /** Render loop */
    function animate() {
      if (!isVisible) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = html.getAttribute('data-theme') === 'dark';
      const color = isDark ? '232, 232, 232' : '26, 26, 26';

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap around edges
        if (p.x < -30) p.x = canvas.width + 30;
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.y < -30) p.y = canvas.height + 30;
        if (p.y > canvas.height + 30) p.y = -30;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px 'Inter', sans-serif`;
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.symbol, 0, 0);
        ctx.restore();
      });

      animId = requestAnimationFrame(animate);
    }

    // Pause animation when hero is not visible (performance)
    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting;
          if (isVisible && !animId) animate();
          if (!isVisible && animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        });
      }, { threshold: 0 });

      heroObserver.observe(canvas);
    }

    // Initialise
    resizeCanvas();
    initParticles();
    animate();

    // Resize handler (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        initParticles();
      }, 200);
    });
  }


  // ───────────────────────────────
  // 7. Contact Form
  // ───────────────────────────────

  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    // Basic validation
    const name = contactForm.querySelector('#contactName');
    const email = contactForm.querySelector('#contactEmail');
    const message = contactForm.querySelector('#contactMessage');

    let valid = true;

    [name, email, message].forEach(field => {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--accent)';
        valid = false;
      }
    });

    // Simple email format check
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.style.borderColor = 'var(--accent)';
      valid = false;
    }

    if (!valid) return;

    // Simulate submission — hide form, show success
    contactForm.style.display = 'none';
    formSuccess?.classList.add('visible');
  });

})();
