# Gautam Vaishnav — MERN Stack Developer
![status](https://img.shields.io/badge/Status-Active%20Builder-111827?style=for-the-badge&color=00ffd5&labelColor=0b0f14)

Hi — I'm Gautam Vaishnav. I design and ship high-scale web systems with a MERN-first mindset: pragmatic, observable, and performance-driven. Currently a BCA student at Maharaja College, I build end-to-end products, compete in hackathons, and focus on system design and performance optimization.

---

## 🚀 Quick Links
- GitHub: [gautamvaishnav1](https://github.com/gautamvaishnav1)
- Savero Studio (live demo): https://savero-next.vercel.app
- World Atlas (live): https://gorgeous-axolotl-b09c4a.netlify.app

---

## 🔦 About Me
- BCA Student — Maharaja College.
- Active builder: full-stack product design, architecture, and deployment.
- Passionate about system design, caching strategies, high-throughput APIs, and UX-focused performance.
- Prefer: clear API contracts, observability-first deployments, and production-first testing.

---

## ✨ Featured Projects

### Savero Studio — [Private / Proprietary]
Live: https://savero-next.vercel.app  
Tech: MERN • TypeScript • Redis • Docker  
Badges: ![MERN](https://img.shields.io/badge/MERN-Stack-0dbbff?style=flat-square&labelColor=0b0f14)&nbsp;![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&labelColor=0b0f14)&nbsp;![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&labelColor=0b0f14)&nbsp;![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&labelColor=0b0f14)

One-liner
- A high-scale e-commerce platform optimized for zero-inventory same‑day dispatch and resilient, multi‑tier cart management.

System architecture (concise)
- Frontend: Next.js + TypeScript with selective SSR and edge caching for catalog pages.
- API: Node.js + Express acting as a modular façade routing to service components.
- Data plane: MongoDB for canonical product/order data; Redis for multi‑tier cart/session store, distributed locks, and caching.
- Operations: Dockerized services, CI/CD pipelines, Vercel for frontend hosting, and centralized observability for logs & metrics.
- Integrations: Payment gateway with idempotency keys and courier orchestration for same‑day dispatch.

Key technical challenges solved
- Zero‑inventory same‑day dispatch: dynamic SKU-to-partner mapping with optimistic reservation via Redis locks and reconciliation to maintain correctness under concurrency.
- Multi‑tier cart: hybrid Redis + persistent reconciliation supporting device sync, TTL-based stale-cart reclaim, and deterministic cart-merge conflict resolution.
- Checkout throughput: idempotent order creation and batched persistence to reduce write amplification while preserving application-level consistency.

Access & demos
- Live demo available at the link above. Source is proprietary; architecture diagrams, API contracts, and admin/demo access can be provided on request.

---

### Reel Watching Platform — [Private / Proprietary]
Tech: MERN • Redis caching • Docker • Cursor-based pagination (infinite scroll)  
Badges: ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&labelColor=0b0f14)&nbsp;![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&labelColor=0b0f14)&nbsp;![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&labelColor=0b0f14)

One-liner
- A high-performance short-video / reel consumption platform engineered for smooth infinite scroll and low-latency playback.

System architecture (concise)
- Frontend: React with client-side virtualization, prefetching, and optimized rendering for video-heavy feeds.
- Backend: Node.js + Express exposing cursor-based endpoints to ensure stable, duplicate-free pagination.
- Caching & Media: Redis for feed and metadata caching; CDN-backed media hosting for video assets and adaptive streaming.
- Data: MongoDB for content and user metadata, with lightweight event capture for playback analytics.

Technical challenges solved
- Infinite scroll consistency: opaque cursor-based pagination to avoid duplication or missing items during concurrent writes.
- Low-latency feed: layered Redis caching with background recompute of ranking buckets and cache-stampede protections.
- Smooth UX under churn: prefetch windows, buffering strategies, and resilient fallback behavior for varying network conditions.

Access & demos
- Repo is private. Demos, architecture notes, or walkthroughs can be shared on request.

---

### World Atlas — Public
Live: https://gorgeous-axolotl-b09c4a.netlify.app  
Tech: React • Data visualization  
Badges: ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&labelColor=0b0f14)&nbsp;![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&labelColor=0b0f14)

What it is
- A React-based global data visualizer that combines public datasets into interactive maps and drill-down dashboards.

Highlights
- Performant rendering with lazy-loaded GeoJSON layers and virtualization.
- Accessible color palettes and responsive design for cross-device viewing.
- Live demo linked above — source is available publicly.

---

## 🛠 Tech Stack

Languages
- JavaScript (ES6+), TypeScript

Frontend
- React, Next.js, React Flow, Tailwind / CSS-in-JS, client-side virtualization libraries

Backend
- Node.js, Express, GraphQL (when required), REST APIs

Databases & Cache
- MongoDB (primary), Redis (caching, sessions, distributed locks)

Infrastructure & Tools
- Docker, Vercel, Netlify, Git, GitHub Actions, CI/CD pipelines, Postman

Observability & Testing
- Centralized logging, request tracing with request IDs, health endpoints, metrics, and load-testing (k6 / locust)

---

## 🔐 Private / Proprietary Repositories — Notes
- Private projects (explicitly marked above) are not public to protect IP and integrations.
- For evaluation or collaboration, I can provide:
  - Live demo access or recorded walkthroughs.
  - Architecture diagrams and API contract documentation.
  - Temporary demo credentials or admin view where appropriate.
- Focus areas emphasized in these projects: idempotency, concurrency control, caching strategy, and operational simplicity.

---

## 📬 Contact & Next Steps
If you'd like:
- This README committed into the repo — tell me and I’ll create a branch and open a PR.
- Architecture diagrams, API docs, or demo credentials for private projects — specify which project and I'll share secure access or a walkthrough.

Thanks for stopping by — I design for speed, scale, and clarity. Let's build something reliable and fast.