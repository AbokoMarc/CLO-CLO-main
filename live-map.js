/* ============================================================
   CLO-CLO Frontend | live-map.js
   Carte de suivi EN DIRECT, partagée par le client (suivi), le livreur
   (livraison active) et l'admin (toutes les livraisons en cours).

   Ce qui la rend « réelle » :
   • marqueurs lisibles (livreur orienté selon son cap, maison, bar) ;
   • déplacement FLUIDE du livreur (animation entre deux positions) ;
   • trajet déjà parcouru (trait plein) + itinéraire ROUTIER restant (pointillés, OSRM) ;
   • ETA et distance calculés PAR LA ROUTE (repli : ligne droite) ;
   • cadrage automatique sans gêner l'utilisateur : dès qu'il déplace la carte,
     le suivi automatique s'arrête et un bouton « Recentrer » apparaît ;
   • fraîcheur de la position (« il y a 4 s », alerte si > 90 s) ;
   • Leaflet chargé avec plusieurs CDN de secours.
   ============================================================ */

const CDNS = [
  ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"],
  ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css", "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"],
  ["https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css", "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"],
];
const loadScript = (src) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
const loadCss = (href) => { if (![...document.styleSheets].some((x) => x.href === href)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); } };

export async function loadLeaflet() {
  if (window.L) return window.L;
  for (const [css, js] of CDNS) {
    try { loadCss(css); await loadScript(js); if (window.L) return window.L; } catch { /* CDN suivant */ }
  }
  return null;
}

const SVG = {
  bike: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M5.5 17 9 9h4l3 8"/><path d="M13 9l-1-3h-2"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  shop: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9l1-5h14l1 5"/><path d="M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 4 0"/><path d="M5 12v8h14v-8"/></svg>',
};

const R = 6371;
export function haversineKm(a, b) {
  const t = (d) => (d * Math.PI) / 180, dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function ageLabel(iso, lang = "fr") {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const fr = lang !== "en";
  if (s < 10) return fr ? "à l'instant" : "just now";
  if (s < 60) return fr ? `il y a ${s} s` : `${s} s ago`;
  const m = Math.round(s / 60);
  return fr ? `il y a ${m} min` : `${m} min ago`;
}

export class LiveMap {
  /**
   * @param {HTMLElement} el   conteneur (hauteur définie en CSS)
   * @param {{route?:boolean, onRoute?:(r:{km:number,minutes:number,road:boolean})=>void}} opts
   */
  constructor(el, opts = {}) {
    this.el = el; this.opts = opts; this.L = null; this.map = null;
    this.drivers = new Map(); this.dests = new Map(); this.shop = null;
    this.follow = true; this.trail = null; this.routeLine = null; this.lastRoute = { at: 0, from: null };
    this.destPoint = null; this.driverPoint = null; this.anim = new Map();
  }

  async init() {
    this.L = await loadLeaflet();
    if (!this.L) {
      this.el.innerHTML = '<div class="lm-fallback">La carte n\'a pas pu se charger (connexion). Le suivi par texte reste actif.</div>';
      return false;
    }
    const L = this.L;
    this.map = L.map(this.el, { zoomControl: false, attributionControl: true, tap: true }).setView([3.866, 11.52], 13);
    L.control.zoom({ position: "topright" }).addTo(this.map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(this.map);
    // L'utilisateur touche la carte → on arrête de la recadrer à sa place.
    const stopFollow = () => { if (this.follow) { this.follow = false; this._btn(true); } };
    this.map.on("dragstart", stopFollow);
    this.map.on("zoomstart", (e) => { if (!this._programmatic) stopFollow(); });
    this._makeRecenterButton();
    setTimeout(() => this.map.invalidateSize(), 250);          // conteneur affiché après coup (onglets, panneaux)
    return true;
  }

  _makeRecenterButton() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "lm-recenter"; b.textContent = "Recentrer"; b.hidden = true;
    b.addEventListener("click", () => { this.follow = true; this._btn(false); this.fit(true); });
    this.el.appendChild(b); this._recenter = b;
  }
  _btn(show) { if (this._recenter) this._recenter.hidden = !show; }

  _icon(kind, heading) {
    const L = this.L;
    if (kind === "driver") {
      const arrow = heading != null ? `<span class="lm-arrow" style="transform:rotate(${heading}deg)"></span>` : "";
      return L.divIcon({ className: "lm-wrap", iconSize: [46, 46], iconAnchor: [23, 23], html: `<div class="lm-driver"><span class="lm-pulse"></span>${arrow}<span class="lm-bubble">${SVG.bike}</span></div>` });
    }
    if (kind === "dest") return L.divIcon({ className: "lm-wrap", iconSize: [36, 46], iconAnchor: [18, 44], html: `<div class="lm-pin lm-home"><span>${SVG.home}</span></div>` });
    return L.divIcon({ className: "lm-wrap", iconSize: [36, 46], iconAnchor: [18, 44], html: `<div class="lm-pin lm-shop"><span>${SVG.shop}</span></div>` });
  }

  setShop(p) {
    if (!this.map || !p) return;
    if (!this.shop) this.shop = this.L.marker([p.lat, p.lng], { icon: this._icon("shop"), zIndexOffset: 100 }).addTo(this.map).bindPopup("Clo-Clo");
    else this.shop.setLatLng([p.lat, p.lng]);
  }

  setDestination(p, { id = "main", label = "Destination" } = {}) {
    if (!this.map || !p) return;
    let m = this.dests.get(id);
    if (!m) { m = this.L.marker([p.lat, p.lng], { icon: this._icon("dest"), zIndexOffset: 200 }).addTo(this.map); this.dests.set(id, m); }
    else m.setLatLng([p.lat, p.lng]);
    m.bindPopup(label);
    if (id === "main") this.destPoint = { lat: p.lat, lng: p.lng };
  }

  setTrail(points) {
    if (!this.map || !points?.length) return;
    const ll = points.map(([a, b]) => [a, b]);
    if (!this.trail) this.trail = this.L.polyline(ll, { color: "#0F5B2C", weight: 5, opacity: 0.85, lineCap: "round" }).addTo(this.map);
    else this.trail.setLatLngs(ll);
  }

  /** Nouvelle position du livreur : le marqueur GLISSE vers elle au lieu de sauter. */
  setDriver(p, { id = "main", label = "Livreur" } = {}) {
    if (!this.map || !p) return;
    let m = this.drivers.get(id);
    const target = { lat: p.lat, lng: p.lng };
    if (!m) {
      m = this.L.marker([p.lat, p.lng], { icon: this._icon("driver", p.heading), zIndexOffset: 1000 }).addTo(this.map);
      m.bindPopup(label); this.drivers.set(id, m);
    } else {
      if (p.heading != null && m._heading !== p.heading) m.setIcon(this._icon("driver", p.heading));
      this._glide(id, m, target);
    }
    m._heading = p.heading;
    if (id === "main") {
      this.driverPoint = target;
      if (this.trail) { const ll = this.trail.getLatLngs(); ll.push([p.lat, p.lng]); this.trail.setLatLngs(ll.slice(-200)); }
      if (this.opts.route) this._maybeRoute();
      this.fit(false);
    } else if (this.follow) this.fit(false);
  }

  _glide(id, marker, to, ms = 1200) {
    cancelAnimationFrame(this.anim.get(id));
    const from = marker.getLatLng(), t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // lissage
      marker.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
      if (k < 1) this.anim.set(id, requestAnimationFrame(step));
    };
    this.anim.set(id, requestAnimationFrame(step));
  }

  /** Cadre livreur + destination (+ bar) ; ne recadre que si le livreur sort de la zone visible. */
  fit(force) {
    if (!this.map || (!this.follow && !force)) return;
    const pts = [];
    this.drivers.forEach((m) => pts.push(m.getLatLng()));
    this.dests.forEach((m) => pts.push(m.getLatLng()));
    if (!pts.length && this.shop) pts.push(this.shop.getLatLng());
    if (!pts.length) return;
    const bounds = this.L.latLngBounds(pts);
    const inner = this.map.getBounds().pad(-0.18);
    const allInside = pts.every((p) => inner.contains(p));
    if (!force && allInside && !this._needsFit) return;
    this._needsFit = false;
    this._programmatic = true;
    if (pts.length === 1) this.map.setView(pts[0], 15, { animate: true });
    else this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17, animate: true });
    setTimeout(() => { this._programmatic = false; }, 700);
  }
  needFit() { this._needsFit = true; this.fit(false); }

  /** Itinéraire par la route (OSRM). Rafraîchi toutes les 25 s ou après 120 m de déplacement. */
  async _maybeRoute() {
    if (!this.driverPoint || !this.destPoint) return;
    const now = Date.now(), from = this.lastRoute.from;
    const moved = from ? haversineKm(from, this.driverPoint) * 1000 : Infinity;
    if (now - this.lastRoute.at < 25000 && moved < 120) return;
    this.lastRoute = { at: now, from: { ...this.driverPoint } };
    const a = this.driverPoint, b = this.destPoint;
    let km = haversineKm(a, b), minutes = Math.max(1, Math.round((km / 25) * 60)), road = false, coords = [[a.lat, a.lng], [b.lat, b.lng]];
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`, { signal: ctl.signal });
      clearTimeout(to);
      const j = await r.json();
      const route = j?.routes?.[0];
      if (route) { coords = route.geometry.coordinates.map(([x, y]) => [y, x]); km = route.distance / 1000; minutes = Math.max(1, Math.round(route.duration / 60)); road = true; }
    } catch { /* hors-ligne ou serveur d'itinéraires occupé : ligne droite */ }
    if (!this.routeLine) this.routeLine = this.L.polyline(coords, { color: "#4C9A52", weight: 5, opacity: 0.9, dashArray: "2 10", lineCap: "round" }).addTo(this.map);
    else this.routeLine.setLatLngs(coords);
    this.opts.onRoute?.({ km, minutes, road });
  }

  destroy() { this.anim.forEach((id) => cancelAnimationFrame(id)); this.map?.remove(); this.map = null; }
}
