/* ============================================================
   CLO-CLO Frontend | traiteur-inbox.js
   Boîte de messagerie réutilisable (client ET admin) :
   • colonne GAUCHE = liste des conversations, défilante, avec recherche,
     filtre « non lues » et pastille de messages non lus ;
   • colonne DROITE = fil de discussion + zone de saisie.
   Sur mobile, une seule colonne à la fois (liste → conversation → bouton retour).
   Rafraîchissement : évènements temps réel (SSE) + relève toutes les 15 s en secours.
   ============================================================ */

/** Échappe le texte venant d'un utilisateur avant tout innerHTML (anti-injection). */
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const locale = () => window.CLOCLO_LOCALE?.() || "fr-FR";
const timeLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(locale(), { day: "2-digit", month: "short" });
};
const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

/**
 * @param {HTMLElement} root
 * @param {{role:"admin"|"client", fetchList:()=>Promise<any[]>, fetchMessages:(id:number)=>Promise<any[]>,
 *          sendMessage:(id:number,text:string)=>Promise<any>, renderTools?:(req:any,helpers:object)=>string,
 *          bindTools?:(el:HTMLElement,req:any,helpers:object)=>void, titleOf:(req:any)=>string, openId?:number|null}} cfg
 */
export function mountInbox(root, cfg) {
  const st = { list: [], active: null, msgs: [], filter: "all", q: "", lastCount: 0 };
  const isAdmin = cfg.role === "admin";
  const unreadOf = (r) => (isAdmin ? r.unreadForAdmin : r.unreadForClient) || 0;

  root.innerHTML = `
    <div class="tm" data-view="list">
      <aside class="tm-side" aria-label="Conversations">
        <div class="tm-side-head">
          <input class="tm-search" type="search" placeholder="Rechercher une conversation…" aria-label="Rechercher une conversation" autocomplete="off"/>
          <div class="tm-filters" role="group" aria-label="Filtrer">
            <button type="button" class="tm-chip on" data-f="all">Toutes</button>
            <button type="button" class="tm-chip" data-f="unread">Non lues <span class="tm-count" hidden></span></button>
          </div>
        </div>
        <ul class="tm-list" role="list"></ul>
      </aside>
      <section class="tm-main" aria-label="Conversation">
        <div class="tm-empty"><div class="tm-empty-ico">💬</div><p>Choisissez une conversation à gauche pour la lire et répondre.</p></div>
        <div class="tm-conv" hidden>
          <header class="tm-conv-head">
            <button type="button" class="tm-back" aria-label="Retour à la liste">←</button>
            <div class="tm-avatar"></div>
            <div class="tm-title"></div>
          </header>
          <div class="tm-tools"></div>
          <div class="tm-msgs" role="log" aria-live="polite" tabindex="0"></div>
          <div class="tm-compose">
            <textarea class="tm-input" rows="1" maxlength="2000" placeholder="Écrire un message…" aria-label="Écrire un message"></textarea>
            <button type="button" class="tm-send" aria-label="Envoyer">Envoyer</button>
          </div>
          <div class="tm-err" role="alert"></div>
        </div>
      </section>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const el = { tm: $(".tm"), list: $(".tm-list"), search: $(".tm-search"), conv: $(".tm-conv"), empty: $(".tm-empty"),
    title: $(".tm-title"), avatar: $(".tm-avatar"), tools: $(".tm-tools"), msgs: $(".tm-msgs"), input: $(".tm-input"), send: $(".tm-send"), err: $(".tm-err"), count: $(".tm-count") };

  const visible = () => st.list.filter((r) => {
    if (st.filter === "unread" && !unreadOf(r)) return false;
    if (!st.q) return true;
    return `${r.nom} ${r.tel} ${r.typeEvenement || ""} ${r.message || ""} ${r.lastMessage?.text || ""}`.toLowerCase().includes(st.q);
  });

  function renderList() {
    const items = visible();
    const totalUnread = st.list.reduce((s, r) => s + unreadOf(r), 0);
    el.count.textContent = String(totalUnread); el.count.hidden = totalUnread === 0;
    el.list.innerHTML = items.length ? items.map((r) => {
      const u = unreadOf(r);
      const snippet = r.lastMessage ? `${r.lastMessage.sender === cfg.role ? "Vous : " : ""}${r.lastMessage.text}` : (r.message || "Nouvelle demande");
      return `<li><button type="button" class="tm-item${r.id === st.active ? " active" : ""}${u ? " unread" : ""}" data-id="${r.id}">
        <span class="tm-avatar">${esc(initials(cfg.titleOf(r)))}</span>
        <span class="tm-item-body">
          <span class="tm-item-top"><b>${esc(cfg.titleOf(r))}</b><time>${esc(timeLabel(r.lastMessage?.createdAt || r.createdAt))}</time></span>
          <span class="tm-item-sub">${esc(r.typeEvenement || "Événement")}${r.nbPersonnes ? " · " + esc(r.nbPersonnes) + " pers." : ""}</span>
          <span class="tm-item-snippet">${esc(snippet)}</span>
        </span>
        ${u ? `<span class="tm-badge" aria-label="${u} non lu(s)">${u}</span>` : ""}
      </button></li>`;
    }).join("") : `<li class="tm-none">${st.q || st.filter === "unread" ? "Aucun résultat." : "Aucune conversation pour l'instant."}</li>`;
  }

  function bubble(m) {
    const mine = m.sender === cfg.role;
    return `<div class="tm-msg ${mine ? "mine" : "theirs"}"><div class="tm-bubble">${esc(m.text).replace(/\n/g, "<br>")}</div><time>${esc(timeLabel(m.createdAt))}</time></div>`;
  }
  function renderMsgs(stick) {
    const atBottom = stick || el.msgs.scrollHeight - el.msgs.scrollTop - el.msgs.clientHeight < 80;
    el.msgs.innerHTML = st.msgs.length ? st.msgs.map(bubble).join("") : `<p class="tm-none">Aucun message. Écrivez le premier !</p>`;
    if (atBottom) el.msgs.scrollTop = el.msgs.scrollHeight;
  }
  const activeReq = () => st.list.find((r) => r.id === st.active);

  async function refreshList() {
    try { st.list = await cfg.fetchList(); renderList(); } catch { /* réseau instable : on réessaie au prochain cycle */ }
  }
  async function refreshMsgs(stick = false) {
    if (st.active == null) return;
    try {
      const msgs = await cfg.fetchMessages(st.active);
      if (msgs.length !== st.lastCount || stick) { st.msgs = msgs; st.lastCount = msgs.length; renderMsgs(stick); }
      const r = activeReq(); if (r) { r.unreadForAdmin = 0; r.unreadForClient = 0; renderList(); }
    } catch (e) { el.err.textContent = e.message || ""; }
  }

  async function open(id) {
    st.active = id; st.lastCount = -1;
    const r = activeReq(); if (!r) return;
    el.empty.hidden = true; el.conv.hidden = false; el.tm.dataset.view = "conv"; el.err.textContent = "";
    el.title.innerHTML = `<b>${esc(cfg.titleOf(r))}</b><span>${esc(r.typeEvenement || "Événement")}${r.dateEvenement ? " · " + esc(r.dateEvenement) : ""}</span>`;
    el.avatar.textContent = initials(cfg.titleOf(r));
    const helpers = { esc, reload: async () => { await refreshList(); open(id); } };
    el.tools.innerHTML = cfg.renderTools ? cfg.renderTools(r, helpers) : "";
    cfg.bindTools?.(el.tools, r, helpers);
    renderList();
    await refreshMsgs(true);
    el.input.focus({ preventScroll: true });
  }

  async function send() {
    const text = el.input.value.trim();
    if (!text || st.active == null || el.send.disabled) return;
    el.send.disabled = true; el.err.textContent = "";
    try {
      const m = await cfg.sendMessage(st.active, text);
      el.input.value = ""; el.input.style.height = "auto";
      st.msgs.push(m); st.lastCount = st.msgs.length; renderMsgs(true);
      refreshList();
    } catch (e) { el.err.textContent = e.message || "Envoi impossible."; }
    el.send.disabled = false;
  }

  el.list.addEventListener("click", (e) => { const b = e.target.closest(".tm-item"); if (b) open(Number(b.dataset.id)); });
  $(".tm-back").addEventListener("click", () => { el.tm.dataset.view = "list"; });
  el.send.addEventListener("click", send);
  el.input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  el.input.addEventListener("input", () => { el.input.style.height = "auto"; el.input.style.height = Math.min(el.input.scrollHeight, 120) + "px"; });
  el.search.addEventListener("input", () => { st.q = el.search.value.trim().toLowerCase(); renderList(); });
  root.querySelectorAll(".tm-chip").forEach((b) => b.addEventListener("click", () => {
    st.filter = b.dataset.f; root.querySelectorAll(".tm-chip").forEach((x) => x.classList.toggle("on", x === b)); renderList();
  }));

  // temps réel (SSE relayé par NotificationService) + relève de secours
  document.addEventListener("cloclo:notif", (e) => {
    if (!String(e.detail?.event || "").startsWith("traiteur:")) return;
    refreshList(); if (st.active != null) refreshMsgs();
  });
  setInterval(() => { if (!document.hidden) { refreshList(); refreshMsgs(); } }, 15000);

  return refreshList().then(() => { if (cfg.openId) open(cfg.openId); else if (!matchMedia("(max-width: 768px)").matches && st.list[0]) open(st.list[0].id); });
}
