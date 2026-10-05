/* ==========================================================================
   ARQ. RONNIE CRUZ | Diseño y Construcción
   app.js: interacciones, animaciones y escena 3D del hero.

   Dependencias locales (carpeta vendor/): GSAP + ScrollTrigger y Lenis.
   Si alguna no carga, la página sigue funcionando (mejora progresiva).

   ÍNDICE
   01 Utilidades y configuración
   02 WhatsApp (enlaces con mensaje por contexto)
   03 Tema claro / oscuro
   04 Preloader
   05 Scroll suave (Lenis) y anclas
   06 Header, progreso y navegación activa
   07 Menú móvil
   08 Titulares divididos y revelados
   09 Hero: palabra rotatoria
   10 Hero: maqueta arquitectónica 3D (canvas)
   11 Marquesina
   12 Manifiesto y contadores
   13 Efectos de puntero (foco, magnetismo)
   14 Proceso (línea que se dibuja)
   15 Comparador plano / resultado
   16 Espacios (galería horizontal)
   17 Por qué elegirnos (vista previa)
   18 FAQ, formulario y botón flotante
   19 Arranque
   ========================================================================== */
(() => {
    'use strict';

    /* ------------------------------------------------------------------
       01 UTILIDADES Y CONFIGURACIÓN
    ------------------------------------------------------------------ */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const root = document.documentElement;
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const HAS_GSAP = Boolean(window.gsap && window.ScrollTrigger);

    if (HAS_GSAP) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
    } else {
        root.classList.add('no-gsap');
    }

    let lenis = null;
    let heroScene = null;

    /* ------------------------------------------------------------------
       02 WHATSAPP
       Cada botón con data-wa abre el chat con un mensaje distinto según
       el punto de la página desde donde se pulsó.
    ------------------------------------------------------------------ */
    const WA_NUMBER = '529381372075';
    const WA_MESSAGES = {
        nav: 'Hola Arq. Ronnie, quiero agendar una cita para platicar mi proyecto.',
        hero: 'Hola Arq. Ronnie, quiero iniciar mi proyecto. ¿Me puede orientar?',
        services: 'Hola Arq. Ronnie, tengo una idea y quiero contarle qué necesito.',
        process: 'Hola Arq. Ronnie, estoy listo para empezar mi proyecto.',
        render: 'Hola Arq. Ronnie, quiero ver mi proyecto en render antes de construir.',
        spaces: 'Hola Arq. Ronnie, me gustó un estilo de su galería y quiero algo así.',
        faq: 'Hola Arq. Ronnie, tengo una duda antes de iniciar mi proyecto.',
        contact: 'Hola Arq. Ronnie, quiero hablar de mi proyecto.',
        footer: 'Hola Arq. Ronnie, quisiera más información.',
        fab: 'Hola Arq. Ronnie, vi su página web y quiero más información.'
    };
    const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

    function initWhatsApp() {
        $$('[data-wa]').forEach((a) => {
            const msg = WA_MESSAGES[a.dataset.wa] || WA_MESSAGES.footer;
            a.href = waLink(msg);
            a.target = '_blank';
            a.rel = 'noopener';
        });
    }

    /* ------------------------------------------------------------------
       03 TEMA CLARO / OSCURO
    ------------------------------------------------------------------ */
    function initTheme() {
        const btn = $('[data-theme-toggle]');
        const meta = $('meta[name="theme-color"]');
        if (!btn) return;

        const apply = (theme, persist) => {
            root.setAttribute('data-theme', theme);
            btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
            if (meta) meta.setAttribute('content', theme === 'dark' ? '#060A12' : '#F4F7FB');
            if (persist) {
                try { localStorage.setItem('rc-theme', theme); } catch (e) { /* almacenamiento no disponible */ }
            }
            window.dispatchEvent(new CustomEvent('themechange'));
        };

        apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
        btn.addEventListener('click', () => {
            apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
        });
    }

    /* ------------------------------------------------------------------
       04 PRELOADER
       Anillo de progreso con la marca. Termina cuando cargan fuentes y la
       página (con un mínimo para que se aprecie) y abre una cortina.
    ------------------------------------------------------------------ */
    function runLoader() {
        return new Promise((resolve) => {
            const loader = $('#loader');
            if (!loader) { root.classList.remove('is-loading'); root.classList.add('is-ready'); resolve(); return; }

            const pctEl = $('#loader-pct');
            const minTime = REDUCED ? 350 : 2400;
            const t0 = performance.now();
            let loaded = false;
            let progress = 0;
            let finished = false;

            const markLoaded = () => { loaded = true; };
            Promise.all([
                document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
                new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })))
            ]).then(markLoaded);
            setTimeout(markLoaded, 6000);                       // red de seguridad

            const render = (v) => {
                loader.style.setProperty('--p', v.toFixed(2));
                if (pctEl) pctEl.textContent = Math.round(v);
            };

            const finish = () => {
                if (finished) return;
                finished = true;
                loader.classList.add('is-done');
                root.classList.remove('is-loading');
                if (lenis) lenis.start();
                setTimeout(() => { root.classList.add('is-ready'); resolve(); }, REDUCED ? 0 : 520);
                setTimeout(() => loader.remove(), REDUCED ? 60 : 1700);
            };

            const frame = (now) => {
                const t = now - t0;
                let target = 94 * (1 - Math.pow(1 - Math.min(t / minTime, 1), 2.4));
                if (loaded && t >= minTime) target = 100;
                progress += (target - progress) * 0.14;
                if (target === 100 && 100 - progress < 0.4) progress = 100;
                render(progress);
                if (progress >= 100) setTimeout(finish, 320);
                else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        });
    }

    /* ------------------------------------------------------------------
       05 SCROLL SUAVE (LENIS) Y ANCLAS
    ------------------------------------------------------------------ */
    function headerOffset() {
        const h = $('.site-header');
        return (h ? h.offsetHeight : 70) + 8;
    }

    function initSmoothScroll() {
        if (REDUCED || !window.Lenis) return;
        lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.9
        });
        lenis.stop();                                            // bloqueado mientras corre el preloader
        if (HAS_GSAP) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    function scrollToTarget(el) {
        if (lenis) lenis.scrollTo(el, { offset: -headerOffset(), duration: 1.6 });
        else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    }
    function scrollToTop() {
        if (lenis) lenis.scrollTo(0, { duration: 1.6 });
        else window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    }

    function initAnchors(closeMenu) {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id === '#top' || id === '#') { e.preventDefault(); closeMenu(); scrollToTop(); return; }
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            closeMenu();
            scrollToTarget(target);
        });
    }

    /* ------------------------------------------------------------------
       06 HEADER, PROGRESO Y NAVEGACIÓN ACTIVA
    ------------------------------------------------------------------ */
    function initHeader() {
        const header = $('.site-header');
        const bar = $('.scroll-progress');
        if (!header) return;

        header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

        if (HAS_GSAP) {
            ScrollTrigger.create({
                start: 0,
                end: 'max',
                onUpdate: (self) => {
                    const y = self.scroll();
                    header.classList.toggle('is-scrolled', y > 40);
                    header.classList.toggle('is-hidden', y > 640 && self.direction === 1 && !root.classList.contains('menu-open'));
                    if (bar) bar.style.setProperty('--sp', self.progress.toFixed(4));
                }
            });
        } else if ('IntersectionObserver' in window) {
            const sentinel = document.createElement('div');
            sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none';
            document.body.prepend(sentinel);
            new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);
        }

        // Enlace activo según la sección visible
        const links = $$('.nav a[href^="#"]');
        const map = new Map();
        links.forEach((l) => { const s = $(l.getAttribute('href')); if (s) map.set(s, l); });
        if ('IntersectionObserver' in window && map.size) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((en) => {
                    if (!en.isIntersecting) return;
                    links.forEach((l) => l.removeAttribute('aria-current'));
                    const l = map.get(en.target);
                    if (l) l.setAttribute('aria-current', 'true');
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            map.forEach((_, section) => io.observe(section));
        }
    }

    /* ------------------------------------------------------------------
       07 MENÚ MÓVIL
    ------------------------------------------------------------------ */
    function initMenu() {
        const btn = $('[data-menu-toggle]');
        const menu = $('#mobile-menu');
        if (!btn || !menu) return () => {};

        const set = (open) => {
            root.classList.toggle('menu-open', open);
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.setAttribute('aria-hidden', String(!open));
            if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            if (lenis && !root.classList.contains('is-loading')) { if (open) lenis.stop(); else lenis.start(); }
        };

        btn.addEventListener('click', () => set(!root.classList.contains('menu-open')));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { set(false); btn.focus(); } });
        window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) set(false); });
        $$('[data-menu-link]').forEach((a) => a.addEventListener('click', () => set(false)));
        return () => { if (root.classList.contains('menu-open')) set(false); };
    }

    /* ------------------------------------------------------------------
       08 TITULARES DIVIDIDOS Y REVELADOS
    ------------------------------------------------------------------ */
    function splitHeadings() {
        $$('.split').forEach((h) => {
            let index = 0;
            const walk = (node) => {
                Array.from(node.childNodes).forEach((child) => {
                    if (child.nodeType === 3) {
                        const frag = document.createDocumentFragment();
                        child.textContent.split(/(\s+)/).forEach((part) => {
                            if (!part) return;
                            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                            const w = document.createElement('span');
                            w.className = 'w';
                            const wi = document.createElement('span');
                            wi.className = 'wi';
                            wi.style.setProperty('--wi', index++);
                            wi.textContent = part;
                            w.appendChild(wi);
                            frag.appendChild(w);
                        });
                        child.replaceWith(frag);
                    } else if (child.nodeType === 1) {
                        walk(child);
                    }
                });
            };
            walk(h);
        });
    }

    function initReveal() {
        const els = $$('[data-reveal], .split');
        if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                en.target.classList.add('in');
                io.unobserve(en.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
        els.forEach((el) => io.observe(el));
    }

    /* ------------------------------------------------------------------
       09 HERO: PALABRA ROTATORIA
       Comunica en un vistazo todo lo que el despacho puede hacer realidad.
    ------------------------------------------------------------------ */
    function initRotator() {
        const wrap = $('[data-rotator]');
        if (!wrap || REDUCED) return;
        const items = $$('.rot', wrap);
        if (items.length < 2) return;
        let i = 0;

        const resetBelow = (el) => {
            el.style.transition = 'none';
            el.classList.remove('is-out', 'is-active');
            void el.offsetWidth;
            el.style.transition = '';
        };

        setInterval(() => {
            if (document.hidden) return;
            const cur = items[i];
            const next = items[(i + 1) % items.length];
            resetBelow(next);
            cur.classList.remove('is-active');
            cur.classList.add('is-out');
            next.classList.add('is-active');
            setTimeout(() => resetBelow(cur), 1100);
            i = (i + 1) % items.length;
        }, 2900);
    }

    /* ------------------------------------------------------------------
       10 HERO: MAQUETA ARQUITECTÓNICA 3D (canvas 2D, sin dependencias)
       Una casa de dos niveles que se "dibuja" sola como un plano, gira con
       suavidad, es escaneada por un plano de luz y reacciona al cursor.
       Todo el movimiento es continuo: la escena nunca queda quieta.
    ------------------------------------------------------------------ */
    class HeroScene {
        constructor(canvas, hero) {
            this.canvas = canvas;
            this.hero = hero;
            this.ctx = canvas.getContext('2d');
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.w = 0;
            this.h = 0;
            this.t = 0;
            this.buildT = -1;                  // -1: aún no inicia la construcción
            this.running = false;
            this.visible = true;
            this.last = 0;
            this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
            this.small = window.innerWidth < 700;

            this.buildModel();
            this.initParticles();
            this.readColors();
            this.bind();
            this.resize();
        }

        /* ---- Geometría (unidades = metros) ---- */
        buildModel() {
            const edges = [];
            const nodes = [];
            const boxes = [];
            const add = (a, b, t0, dur, kind) => edges.push({ a, b, t0, dur, kind });

            const box = (x0, y0, z0, x1, y1, z1, t0, span, kind, markNodes) => {
                const V = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
                const L = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
                L.forEach(([i, j], n) => add(V[i], V[j], t0 + (n * span) / 12, 0.9, kind));
                if (markNodes) V.forEach((v) => nodes.push(v));
                if (kind === 'major') boxes.push({ V, ready: t0 + span + 0.5 });
            };
            const rect = (x0, y, z0, x1, z1, t0, kind) => {
                const P = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
                for (let i = 0; i < 4; i++) add(P[i], P[(i + 1) % 4], t0 + i * 0.12, 0.8, kind);
            };
            const ring = (cx, y, cz, r, t0, kind, seg = 16) => {
                for (let i = 0; i < seg; i++) {
                    const a0 = (i / seg) * Math.PI * 2;
                    const a1 = ((i + 1) / seg) * Math.PI * 2;
                    add([cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], t0 + i * 0.03, 0.5, kind);
                }
            };

            // Lote
            rect(-8, 0, -5.6, 8.4, 6.4, 0.2, 'ground');
            // Volumen inferior y superior (voladizo)
            box(-5.5, 0, -3, 2.5, 3, 2.5, 0.9, 1.6, 'major', true);
            box(-1.5, 3, -3.5, 6, 6, 1.5, 2.0, 1.6, 'major', true);
            // Losa de cubierta con volado
            box(-1.9, 6, -3.9, 6.4, 6.3, 1.9, 3.3, 1.1, 'major', false);
            // Pretil de la terraza
            rect(-5.5, 3.7, -3, -1.5, 2.5, 3.5, 'minor');
            [[-5.5, -3], [-1.5, -3], [-1.5, 2.5], [-5.5, 2.5]].forEach(([x, z], i) => add([x, 3, z], [x, 3.7, z], 3.6 + i * 0.1, 0.4, 'minor'));
            // Ventanería frente inferior
            for (let i = 1; i < 8; i++) add([-5.5 + i, 0, 2.5], [-5.5 + i, 3, 2.5], 3.9 + i * 0.1, 0.6, 'minor');
            add([-5.5, 2.2, 2.5], [2.5, 2.2, 2.5], 4.1, 0.9, 'minor');
            // Ventanería frente superior y lateral
            for (let i = 1; i < 5; i++) add([-1.5 + i * 1.5, 3, 1.5], [-1.5 + i * 1.5, 6, 1.5], 4.2 + i * 0.1, 0.6, 'minor');
            add([-1.5, 4.3, 1.5], [6, 4.3, 1.5], 4.4, 0.9, 'minor');
            for (let i = 1; i < 4; i++) add([6, 3, -3.5 + i * 1.25], [6, 6, -3.5 + i * 1.25], 4.5 + i * 0.1, 0.6, 'minor');
            // Alberca y escalones
            rect(-6.5, 0.02, 3.2, -1, 5.2, 4.7, 'minor');
            rect(-6.1, 0.02, 3.6, -1.4, 4.8, 4.9, 'minor');
            box(-0.5, 0, 2.5, 1.5, 0.2, 3.0, 4.9, 0.6, 'minor', false);
            box(-0.5, 0, 3.0, 1.5, 0.1, 3.5, 5.1, 0.6, 'minor', false);
            // Árboles
            [[7.1, 3.8], [-7.2, -3.6]].forEach(([x, z], k) => {
                add([x, 0, z], [x, 2.2, z], 5.2 + k * 0.2, 0.7, 'minor');
                ring(x, 2.2, z, 1.25, 5.4 + k * 0.2, 'minor');
                ring(x, 2.9, z, 1.0, 5.55 + k * 0.2, 'minor');
                ring(x, 3.5, z, 0.6, 5.7 + k * 0.2, 'minor');
            });

            this.edges = edges;
            this.nodes = nodes;
            this.boxes = boxes;
            this.faceIdx = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
            this.dims = [
                { a: [-5.5, 0, 2.5], b: [2.5, 0, 2.5], off: [0, 0, 1.15], label: '8.00 m', t0: 6.0 },
                { a: [6, 0, 1.5], b: [6, 6.3, 1.5], off: [1.4, 0, 0], label: '6.30 m', t0: 6.4 }
            ];
            this.totalBuild = 7;

            // Retícula del terreno
            this.grid = [];
            for (let g = -14; g <= 14; g += 2) {
                for (let s = -14; s < 14; s += 2) {
                    this.grid.push([s, g, s + 2, g]);      // línea paralela a X
                    this.grid.push([g, s, g, s + 2]);      // línea paralela a Z
                }
            }
        }

        initParticles() {
            const n = this.small ? 34 : 72;
            this.particles = Array.from({ length: n }, () => ({
                x: (Math.random() - 0.5) * 30,
                y: Math.random() * 11,
                z: (Math.random() - 0.5) * 22,
                vy: 0.12 + Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 0.15,
                s: 0.8 + Math.random() * 1.6,
                p: Math.random() * Math.PI * 2
            }));
        }

        readColors() {
            const cs = getComputedStyle(root);
            this.line = cs.getPropertyValue('--scene-rgb').trim() || '91,180,238';
            this.hi = cs.getPropertyValue('--scene-hi-rgb').trim() || '226,244,255';
        }

        bind() {
            this.ro = new ResizeObserver(() => this.resize());
            this.ro.observe(this.hero);

            if (FINE_POINTER) {
                this.hero.addEventListener('pointermove', (e) => {
                    const r = this.hero.getBoundingClientRect();
                    const nx = (e.clientX - r.left) / r.width;
                    const ny = (e.clientY - r.top) / r.height;
                    this.mouse.tx = (nx - 0.5) * 2;
                    this.mouse.ty = (ny - 0.5) * 2;
                    this.hero.style.setProperty('--gx', (nx * 100).toFixed(1) + '%');
                    this.hero.style.setProperty('--gy', (ny * 100).toFixed(1) + '%');
                });
                this.hero.addEventListener('pointerleave', () => { this.mouse.tx = 0; this.mouse.ty = 0; });
            }

            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([en]) => {
                    this.visible = en.isIntersecting;
                    if (this.visible && this.running) this.loop(performance.now());
                }, { threshold: 0 }).observe(this.hero);
            }
            document.addEventListener('visibilitychange', () => { if (!document.hidden && this.running && this.visible) { this.last = performance.now(); this.loop(this.last); } });
            window.addEventListener('themechange', () => { this.readColors(); if (!this.running || REDUCED) this.draw(); });
        }

        resize() {
            const r = this.hero.getBoundingClientRect();
            this.w = Math.max(1, Math.round(r.width));
            this.h = Math.max(1, Math.round(r.height));
            this.small = this.w < 700;
            this.dpr = Math.min(window.devicePixelRatio || 1, this.small ? 1.6 : 2);
            this.canvas.width = Math.round(this.w * this.dpr);
            this.canvas.height = Math.round(this.h * this.dpr);
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

            if (this.w >= 1024) { this.cx = this.w * 0.735; this.cy = this.h * 0.56; this.k = Math.min(this.w * 0.62, this.h * 1.2) / 21; }
            else if (this.w >= 640) { this.cx = this.w * 0.62; this.cy = this.h * 0.76; this.k = Math.min(this.w * 0.8, this.h * 0.72) / 17; }
            else { this.cx = this.w * 0.5; this.cy = this.h * 0.8; this.k = Math.min(this.w * 1.0, this.h * 0.56) / 17.5; }

            if (!this.running || REDUCED) this.draw();
        }

        start() {
            if (REDUCED) { this.buildT = this.totalBuild + 1; this.t = 3; this.draw(); return; }
            this.buildT = 0;
            this.running = true;
            this.last = performance.now();
            this.loop(this.last);
        }

        loop(now) {
            if (!this.running || !this.visible || document.hidden) return;
            if (this.raf) cancelAnimationFrame(this.raf);
            const dt = Math.min((now - this.last) / 1000, 0.05);
            this.last = now;
            this.update(dt);
            this.draw();
            this.raf = requestAnimationFrame((n) => this.loop(n));
        }

        update(dt) {
            this.t += dt;
            if (this.buildT >= 0) this.buildT += dt;
            this.mouse.x = lerp(this.mouse.x, this.mouse.tx, 0.05);
            this.mouse.y = lerp(this.mouse.y, this.mouse.ty, 0.05);
            this.particles.forEach((p) => {
                p.y += p.vy * dt;
                p.x += p.vx * dt;
                if (p.y > 11) { p.y = 0; p.x = (Math.random() - 0.5) * 30; }
            });
        }

        /* Proyección: giro (yaw), inclinación (pitch) y perspectiva */
        proj(x, y, z) {
            x -= 0.2; y -= 3.1; z += 0.5;
            const X1 = x * this.cosY + z * this.sinY;
            const Z1 = -x * this.sinY + z * this.cosY;
            const Y2 = y * this.cosP + Z1 * this.sinP;
            const Z2 = -y * this.sinP + Z1 * this.cosP;
            const s = 34 / (34 + Z2);
            return { x: this.cx + X1 * this.k * s, y: this.cy - Y2 * this.k * s, z: Z2, s };
        }

        draw() {
            const ctx = this.ctx;
            const { w, h } = this;
            ctx.clearRect(0, 0, w, h);
            if (this.buildT < 0) return;

            const t = this.t;
            const bt = this.buildT;
            // La cámara mira hacia -Z: sumar PI deja la fachada de vidrio (z+) de cara al espectador
            const yaw = Math.PI - 0.58 + Math.sin(t * 0.16) * 0.42 + this.mouse.x * 0.34;
            const pitch = 0.46 + this.mouse.y * 0.08 + Math.sin(t * 0.11) * 0.02;
            this.cosY = Math.cos(yaw); this.sinY = Math.sin(yaw);
            this.cosP = Math.cos(pitch); this.sinP = Math.sin(pitch);

            const L = this.line;
            const H = this.hi;
            const k = this.k;
            const done = clamp((bt - this.totalBuild) / 1.5, 0, 1);
            const scanY = ((t * 1.05) % 8.4) - 0.9;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            /* Anillo de marca detrás de la casa: dos arcos con aberturas, como en el logotipo */
            const ringFade = clamp(bt / 1.2, 0, 1);
            const R = k * 11.2;
            const rcy = this.cy - k * 1.1;
            const a0 = t * 0.12;
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = `rgba(${L},${0.42 * ringFade})`;
            ctx.beginPath(); ctx.arc(this.cx, rcy, R, a0 + 0.35, a0 + Math.PI * 0.82); ctx.stroke();
            ctx.beginPath(); ctx.arc(this.cx, rcy, R, a0 + Math.PI * 0.82 + 0.55, a0 + Math.PI * 2 - 0.3); ctx.stroke();
            ctx.setLineDash([2, 9]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${L},${0.3 * ringFade})`;
            ctx.beginPath(); ctx.arc(this.cx, rcy, R * 1.1, -a0 * 1.3, -a0 * 1.3 + Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);

            /* Retícula del terreno con desvanecido radial */
            const gridFade = clamp(bt / 1.6, 0, 1);
            ctx.lineWidth = 1;
            for (let i = 0; i < this.grid.length; i++) {
                const g = this.grid[i];
                const mx = (g[0] + g[2]) / 2;
                const mz = (g[1] + g[3]) / 2;
                const d = Math.hypot(mx, mz);
                const a = (1 - d / 17) * 0.2 * gridFade;
                if (a <= 0.01) continue;
                const p1 = this.proj(g[0], 0, g[1]);
                const p2 = this.proj(g[2], 0, g[3]);
                ctx.strokeStyle = `rgba(${L},${a})`;
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }

            /* Plano de escaneo que sube y baja por el edificio */
            if (done > 0) {
                const P = [[-8, -6], [8, -6], [8, 6], [-8, 6]].map(([x, z]) => this.proj(x, scanY, z));
                const fade = Math.sin(clamp((scanY + 0.9) / 8.4, 0, 1) * Math.PI);
                ctx.beginPath();
                ctx.moveTo(P[0].x, P[0].y);
                for (let i = 1; i < 4; i++) ctx.lineTo(P[i].x, P[i].y);
                ctx.closePath();
                ctx.fillStyle = `rgba(${L},${0.045 * fade * done})`;
                ctx.fill();
                ctx.setLineDash([6, 8]);
                ctx.strokeStyle = `rgba(${H},${0.3 * fade * done})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
            }

            /* Caras translúcidas (de atrás hacia adelante) para dar volumen a los bloques */
            for (let b = 0; b < this.boxes.length; b++) {
                const box = this.boxes[b];
                const fa = clamp((bt - box.ready) / 1.2, 0, 1);
                if (fa <= 0) continue;
                const PV = box.V.map((v) => this.proj(v[0], v[1], v[2]));
                const faces = this.faceIdx.map((idx) => ({ idx, z: idx.reduce((s, i) => s + PV[i].z, 0) / 4 })).sort((p, q) => q.z - p.z);
                faces.forEach((f, order) => {
                    ctx.beginPath();
                    ctx.moveTo(PV[f.idx[0]].x, PV[f.idx[0]].y);
                    for (let i = 1; i < 4; i++) ctx.lineTo(PV[f.idx[i]].x, PV[f.idx[i]].y);
                    ctx.closePath();
                    ctx.fillStyle = `rgba(${L},${(0.035 + order * 0.012) * fa})`;
                    ctx.fill();
                });
            }

            /* Aristas: se dibujan progresivamente con un "lápiz" luminoso en la punta */
            const tips = [];
            for (let i = 0; i < this.edges.length; i++) {
                const e = this.edges[i];
                const prog = clamp((bt - e.t0) / e.dur, 0, 1);
                if (prog <= 0) continue;
                const kk = easeOutCubic(prog);
                const pa = this.proj(e.a[0], e.a[1], e.a[2]);
                const pb = this.proj(lerp(e.a[0], e.b[0], kk), lerp(e.a[1], e.b[1], kk), lerp(e.a[2], e.b[2], kk));
                const depth = (pa.z + pb.z) / 2;
                const df = clamp(1 - (depth + 9) / 24, 0.28, 1);
                const ym = (e.a[1] + e.b[1]) / 2;
                const sd = Math.abs(ym - scanY);
                const sh = done > 0 && sd < 0.55 ? 1 - sd / 0.55 : 0;

                let alpha; let width; let dash = null;
                if (e.kind === 'major') { alpha = 0.92; width = 1.6; }
                else if (e.kind === 'minor') { alpha = 0.5; width = 1; }
                else { alpha = 0.55; width = 1; dash = [7, 7]; }

                ctx.setLineDash(dash || []);
                ctx.lineWidth = width + sh * 1.3;
                ctx.strokeStyle = sh > 0.04 ? `rgba(${H},${Math.min(1, alpha * df + sh * 0.7)})` : `rgba(${L},${alpha * df})`;
                ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
                if (prog < 1 && e.kind === 'major') tips.push(pb);
            }
            ctx.setLineDash([]);
            tips.forEach((p) => {
                ctx.fillStyle = `rgba(${H},0.18)`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(${H},0.95)`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
            });

            /* Nodos en los vértices (laten suavemente) */
            if (done > 0) {
                for (let i = 0; i < this.nodes.length; i++) {
                    const n = this.nodes[i];
                    const p = this.proj(n[0], n[1], n[2]);
                    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7);
                    ctx.fillStyle = `rgba(${H},${(0.35 + pulse * 0.5) * done})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + pulse * 1.2, 0, Math.PI * 2); ctx.fill();
                }
            }

            /* Cotas de arquitecto */
            if (done > 0) {
                ctx.font = '500 11px "Geist Mono", ui-monospace, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                this.dims.forEach((d) => {
                    const f = clamp((bt - d.t0) / 0.9, 0, 1);
                    if (f <= 0) return;
                    const A = this.proj(d.a[0], d.a[1], d.a[2]);
                    const B = this.proj(d.b[0], d.b[1], d.b[2]);
                    const A2 = this.proj(d.a[0] + d.off[0], d.a[1] + d.off[1], d.a[2] + d.off[2]);
                    const B2 = this.proj(d.b[0] + d.off[0], d.b[1] + d.off[1], d.b[2] + d.off[2]);
                    ctx.strokeStyle = `rgba(${H},${0.5 * f})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(A.x, A.y); ctx.lineTo(A2.x, A2.y);
                    ctx.moveTo(B.x, B.y); ctx.lineTo(B2.x, B2.y);
                    ctx.moveTo(A2.x, A2.y); ctx.lineTo(B2.x, B2.y);
                    ctx.stroke();
                    [A2, B2].forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fillStyle = `rgba(${H},${0.9 * f})`; ctx.fill(); });
                    const mx = (A2.x + B2.x) / 2;
                    const my = (A2.y + B2.y) / 2;
                    ctx.fillStyle = `rgba(${H},${0.92 * f})`;
                    ctx.fillText(d.label, mx, my - 13);
                });
            }

            /* Partículas con conexiones (red de puntos) */
            const pts = [];
            const pf = clamp((bt - 1) / 2, 0, 1);
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                const q = this.proj(p.x, p.y, p.z);
                const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + p.p);
                pts.push(q);
                ctx.fillStyle = `rgba(${H},${(0.18 + tw * 0.5) * pf})`;
                ctx.beginPath(); ctx.arc(q.x, q.y, p.s * q.s, 0, Math.PI * 2); ctx.fill();
            }
            const linkDist = this.small ? 70 : 96;
            ctx.lineWidth = 1;
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x;
                    const dy = pts[i].y - pts[j].y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < linkDist * linkDist) {
                        const a = (1 - Math.sqrt(d2) / linkDist) * 0.2 * pf;
                        ctx.strokeStyle = `rgba(${L},${a})`;
                        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
                    }
                }
            }
        }
    }

    function initHero() {
        const canvas = $('#hero-canvas');
        const hero = $('.hero');
        if (!canvas || !hero || !canvas.getContext) return;
        heroScene = new HeroScene(canvas, hero);

        if (HAS_GSAP && !REDUCED) {
            gsap.to('.hero-copy', {
                yPercent: -10, opacity: 0.2, ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: true }
            });
            gsap.to(canvas, {
                yPercent: 10, ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
            });
        }
    }

    /* ------------------------------------------------------------------
       11 MARQUESINA (única de la página; acelera con la velocidad de scroll)
    ------------------------------------------------------------------ */
    function initMarquee() {
        const track = $('[data-marquee]');
        if (!track || REDUCED) return;
        const group = track.firstElementChild;
        const wrap = track.parentElement;
        let gw = group.getBoundingClientRect().width;
        const copies = Math.ceil((window.innerWidth * 2) / Math.max(gw, 1)) + 1;
        for (let n = 0; n < copies; n++) {
            const c = group.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            track.appendChild(c);
        }
        new ResizeObserver(() => { gw = group.getBoundingClientRect().width; }).observe(group);

        let x = 0;
        let boost = 0;
        let last = 0;
        let visible = false;
        const loop = (now) => {
            if (!visible) return;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            const v = lenis ? Math.abs(lenis.velocity) : 0;
            boost += (Math.min(v * 7, 320) - boost) * 0.08;
            x -= (64 + boost) * dt;
            if (x <= -gw) x += gw;
            track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
            requestAnimationFrame(loop);
        };
        new IntersectionObserver(([en]) => {
            visible = en.isIntersecting;
            if (visible) { last = performance.now(); requestAnimationFrame(loop); }
        }, { rootMargin: '120px' }).observe(wrap);
    }

    /* ------------------------------------------------------------------
       12 MANIFIESTO Y CONTADORES
    ------------------------------------------------------------------ */
    function initManifesto() {
        const p = $('[data-words]');
        if (!p) return;
        const text = p.textContent.trim();
        const words = text.split(/\s+/);
        p.textContent = '';
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = text;
        const vis = document.createElement('span');
        vis.setAttribute('aria-hidden', 'true');
        words.forEach((w, i) => {
            const s = document.createElement('span');
            s.className = 'mw';
            s.textContent = w;
            vis.appendChild(s);
            if (i < words.length - 1) vis.appendChild(document.createTextNode(' '));
        });
        p.append(sr, vis);

        if (HAS_GSAP && !REDUCED) {
            // El texto se "enciende" palabra por palabra mientras lo lees
            gsap.fromTo($$('.mw', p), { opacity: 0.16 }, {
                opacity: 1, ease: 'none', stagger: 0.12,
                scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 52%', scrub: 0.5 }
            });
        } else {
            $$('.mw', p).forEach((w) => { w.style.opacity = 1; });
        }
    }

    function initCounters() {
        const els = $$('[data-count]');
        if (!els.length || REDUCED || !('IntersectionObserver' in window)) return;
        els.forEach((el) => { el.textContent = '0'; });
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                io.unobserve(en.target);
                const el = en.target;
                const target = Number(el.dataset.count);
                const dur = 1600;
                const t0 = performance.now();
                const step = (now) => {
                    const p = clamp((now - t0) / dur, 0, 1);
                    el.textContent = Math.round(target * (1 - Math.pow(2, -10 * p)) / (1 - Math.pow(2, -10)));
                    if (p < 1) requestAnimationFrame(step); else el.textContent = target;
                };
                requestAnimationFrame(step);
            });
        }, { threshold: 0.6 });
        els.forEach((el) => io.observe(el));
    }

    /* ------------------------------------------------------------------
       13 EFECTOS DE PUNTERO
    ------------------------------------------------------------------ */
    function initPointerEffects() {
        if (!FINE_POINTER) return;

        // Foco de luz que sigue al cursor dentro de cada celda del bento
        $$('[data-spot]').forEach((cell) => {
            cell.addEventListener('pointermove', (e) => {
                const r = cell.getBoundingClientRect();
                cell.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                cell.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });

        // Botones magnéticos
        if (REDUCED) return;
        $$('[data-magnetic]').forEach((btn) => {
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                const x = (e.clientX - (r.left + r.width / 2)) * 0.26;
                const y = (e.clientY - (r.top + r.height / 2)) * 0.34;
                btn.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
            });
            btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
        });
    }

    /* ------------------------------------------------------------------
       14 PROCESO: la línea se dibuja y cada etapa se enciende al llegar
    ------------------------------------------------------------------ */
    function initProcess() {
        const steps = $('[data-steps]');
        if (!steps) return;
        const items = $$('.step', steps);

        if (!HAS_GSAP || REDUCED) { items.forEach((it) => it.classList.add('is-active')); return; }

        let tops = [];
        let H = 1;
        let lineLen = 1;
        const measure = () => {
            tops = items.map((it) => it.offsetTop + 26);
            H = steps.offsetHeight;
            lineLen = Math.max(1, tops[tops.length - 1] - 26);
            steps.style.setProperty('--line-h', lineLen + 'px');   // el riel termina en el último nodo
        };
        measure();
        steps.style.setProperty('--sf', 0);

        ScrollTrigger.create({
            trigger: steps,
            start: 'top 62%',
            end: 'bottom 62%',
            onRefresh: measure,
            onUpdate: (self) => {
                const y = self.progress * H;
                steps.style.setProperty('--sf', clamp((y - 26) / lineLen, 0, 1).toFixed(4));
                items.forEach((it, i) => it.classList.toggle('is-active', y >= tops[i] - 6));
            }
        });
    }

    /* ------------------------------------------------------------------
       15 COMPARADOR PLANO / RESULTADO
       Se mueve solo (movimiento constante). Al tocarlo o pasar el cursor,
       el control pasa al usuario y vuelve a la automática al soltarlo.
    ------------------------------------------------------------------ */
    function initCompare() {
        const box = $('[data-compare]');
        if (!box) return;
        const frame = $('.compare-frame', box);
        const range = $('.compare-range', box);

        let pos = 0.5;
        let target = 0.5;
        let user = false;
        let dragging = false;
        let inView = false;
        let auto = 0;
        let last = 0;
        let idle = 0;

        const setPos = (v) => {
            pos = clamp(v, 0, 1);
            frame.style.setProperty('--pos', pos.toFixed(4));
            range.value = Math.round(pos * 100);
        };
        const fromEvent = (e) => {
            const r = frame.getBoundingClientRect();
            return clamp((e.clientX - r.left) / r.width, 0, 1);
        };
        const release = () => {
            clearTimeout(idle);
            idle = setTimeout(() => { user = false; auto = Math.asin(clamp((pos - 0.5) / 0.38, -1, 1)) / 0.75; }, 3200);
        };

        frame.addEventListener('pointerdown', (e) => {
            dragging = true; user = true; target = fromEvent(e);
            try { frame.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        });
        frame.addEventListener('pointermove', (e) => {
            if (dragging || e.pointerType === 'mouse') { user = true; target = fromEvent(e); }
        });
        const end = () => { dragging = false; release(); };
        frame.addEventListener('pointerup', end);
        frame.addEventListener('pointercancel', end);
        frame.addEventListener('pointerleave', () => { if (!dragging) release(); });
        range.addEventListener('input', () => { user = true; target = Number(range.value) / 100; release(); });

        if (REDUCED) { range.addEventListener('input', () => setPos(Number(range.value) / 100)); frame.addEventListener('pointermove', (e) => { if (dragging) setPos(fromEvent(e)); }); return; }

        const tick = (now) => {
            if (!inView) return;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (!user) { auto += dt; target = 0.5 + Math.sin(auto * 0.75) * 0.38; }
            setPos(lerp(pos, target, user ? 0.22 : 0.07));
            requestAnimationFrame(tick);
        };
        new IntersectionObserver(([en]) => {
            inView = en.isIntersecting;
            if (inView) { last = performance.now(); requestAnimationFrame(tick); }
        }, { threshold: 0.2 }).observe(frame);
    }

    /* ------------------------------------------------------------------
       16 ESPACIOS: scroll vertical convertido en desplazamiento horizontal
       (solo en escritorio; en móvil es un carrusel táctil con snap)
    ------------------------------------------------------------------ */
    function initSpaces() {
        const pin = $('[data-hpan]');
        if (!pin || !HAS_GSAP || REDUCED) return;
        const viewport = $('[data-hpan-viewport]', pin);
        const track = $('[data-hpan-track]', pin);

        gsap.matchMedia().add('(min-width: 1024px)', () => {
            pin.classList.add('is-pinned');
            const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
            gsap.to(track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: pin,
                    start: 'top top',
                    end: () => '+=' + distance(),
                    pin: true,
                    scrub: 0.8,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => pin.style.setProperty('--hp', self.progress.toFixed(4))
                }
            });
            return () => { pin.classList.remove('is-pinned'); gsap.set(track, { clearProps: 'transform' }); };
        });
    }

    function initParallax() {
        if (!HAS_GSAP || REDUCED) return;
        $$('[data-parallax]').forEach((img) => {
            gsap.fromTo(img, { yPercent: -7 }, {
                yPercent: 7, ease: 'none',
                scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
    }

    /* ------------------------------------------------------------------
       17 POR QUÉ ELEGIRNOS: vista previa que sigue al cursor
    ------------------------------------------------------------------ */
    function initWhy() {
        const list = $('[data-why]');
        const preview = $('.why-preview');
        if (!list || !preview || !FINE_POINTER) return;
        const imgs = $$('img', preview);
        const rows = $$('.why-row', list);
        const section = preview.parentElement.closest('.why') || preview.parentElement;

        let tx = 0; let ty = 0; let x = 0; let y = 0; let raf = 0; let shown = false;
        const loop = () => {
            x = lerp(x, tx, 0.14);
            y = lerp(y, ty, 0.14);
            preview.style.setProperty('--px', x.toFixed(1) + 'px');
            preview.style.setProperty('--py', y.toFixed(1) + 'px');
            raf = (shown || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) ? requestAnimationFrame(loop) : 0;
        };

        list.addEventListener('pointermove', (e) => {
            const r = section.getBoundingClientRect();
            const w = preview.offsetWidth;
            const h = preview.offsetHeight;
            tx = Math.min(e.clientX - r.left + 30, r.width - w - 12);
            ty = e.clientY - r.top - h / 2;
            if (!shown) { x = tx; y = ty; }
            if (!raf) raf = requestAnimationFrame(loop);
        });
        rows.forEach((row) => {
            row.addEventListener('pointerenter', () => {
                const idx = Number(row.dataset.preview);
                rows.forEach((r) => r.classList.toggle('is-active', r === row));
                imgs.forEach((im, i) => im.classList.toggle('is-on', i === idx));
                list.classList.add('has-active');
                preview.classList.add('is-visible');
                shown = true;
            });
        });
        list.addEventListener('pointerleave', () => {
            shown = false;
            preview.classList.remove('is-visible');
            list.classList.remove('has-active');
            rows.forEach((r) => r.classList.remove('is-active'));
        });
    }

    /* ------------------------------------------------------------------
       18 FAQ, FORMULARIO Y BOTÓN FLOTANTE
    ------------------------------------------------------------------ */
    function initFaq() {
        const buttons = $$('.faq-q');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') === 'true';
                buttons.forEach((b) => {
                    b.setAttribute('aria-expanded', 'false');
                    b.closest('.faq-item').classList.remove('is-open');
                });
                if (!open) {
                    btn.setAttribute('aria-expanded', 'true');
                    btn.closest('.faq-item').classList.add('is-open');
                }
            });
        });
    }

    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const nombre = $('#f-nombre');
        const tel = $('#f-tel');
        const serv = $('#f-servicio');
        const msg = $('#f-mensaje');
        const ok = $('#form-success');
        const fallback = $('#form-fallback');

        const setError = (input, text) => {
            const field = input.closest('.field');
            const err = $('.field-error', field);
            field.classList.toggle('has-error', Boolean(text));
            if (err) err.textContent = text || '';
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
        };

        [nombre, serv].forEach((el) => el.addEventListener('input', () => setError(el, '')));
        serv.addEventListener('change', () => setError(serv, ''));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let valid = true;
            if (!nombre.value.trim()) { setError(nombre, 'Escribe tu nombre para saber cómo dirigirnos a ti.'); valid = false; } else setError(nombre, '');
            if (!serv.value) { setError(serv, 'Elige el servicio que más se acerca a lo que necesitas.'); valid = false; } else setError(serv, '');
            if (!valid) { (form.querySelector('[aria-invalid="true"]') || nombre).focus(); return; }

            const lines = [`Hola Arq. Ronnie, soy ${nombre.value.trim()}.`, `Me interesa: ${serv.value}.`];
            if (msg.value.trim()) lines.push(`Mi idea: ${msg.value.trim()}`);
            if (tel.value.trim()) lines.push(`Mi teléfono: ${tel.value.trim()}`);
            lines.push('Quisiera agendar una cita.');
            const url = waLink(lines.join('\n'));

            if (fallback) fallback.href = url;
            if (ok) ok.hidden = false;
            window.open(url, '_blank', 'noopener');
        });
    }

    function initFab() {
        const fab = $('.fab');
        if (!fab) return;
        setTimeout(() => {
            fab.classList.add('show-tip');
            setTimeout(() => fab.classList.remove('show-tip'), 5200);
        }, 7000);
    }

    /* ------------------------------------------------------------------
       19 ARRANQUE
    ------------------------------------------------------------------ */
    function boot() {
        initWhatsApp();
        initTheme();
        initSmoothScroll();
        splitHeadings();
        const closeMenu = initMenu();
        initAnchors(closeMenu);
        initHeader();
        initReveal();
        initHero();
        initManifesto();
        initProcess();
        initSpaces();
        initParallax();
        initCompare();
        initWhy();
        initFaq();
        initForm();
        initPointerEffects();

        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        fontsReady.then(() => { initMarquee(); initCounters(); if (HAS_GSAP) ScrollTrigger.refresh(); });
        window.addEventListener('load', () => { if (HAS_GSAP) ScrollTrigger.refresh(); });

        runLoader().then(() => {
            if (lenis) lenis.start();
            if (heroScene) heroScene.start();
            initRotator();
            initFab();
            if (HAS_GSAP) ScrollTrigger.refresh();
        });
    }

    boot();
})();
