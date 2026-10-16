process.env.JWT_SECRET="0123456789abcdef0123"; process.env.ADMIN_USERNAME="admin"; process.env.ADMIN_PASSWORD="adminpass1";
import crypto from "node:crypto";
const { generateKeyPairSync } = crypto;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const sent = [], tokenCalls = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes("oauth2.googleapis.com")) { tokenCalls.push(init); return new Response(JSON.stringify({ access_token: "AT123", expires_in: 3600 }), { status: 200 }); }
  if (String(url).includes("fcm.googleapis.com")) {
    const body = JSON.parse(init.body); sent.push({ auth: init.headers.Authorization, ...body.message, url });
    if (body.message.token.startsWith("dead")) return new Response(JSON.stringify({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 });
    return new Response("{}", { status: 200 });
  }
  throw new Error("fetch inattendu " + url);
};
const B = new URL("../src/", import.meta.url).pathname;
const { Store } = await import(B + "repositories/store.js");
const { runBootstrap } = await import(B + "bootstrap.js");
const fcm = await import(B + "fcm.js");
const { JOBS, runAll } = await import(B + "scheduler.js");
const { pushPlan } = await import(B + "notify.js");
await runBootstrap();
fcm._setAccountForTests({ project_id: "cloclo-test", client_email: "svc@cloclo-test.iam.gserviceaccount.com", private_key: privateKey });
let ok = 0, ko = 0; const t = (n, c, x) => { c ? ok++ : ko++; console.log(c ? "✅" : "❌", n, c ? "" : JSON.stringify(x)); };
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

// ── jeu de données
const cli = await Store.insert("users", { nom: "Cli", email: "c@x.cm", tel: "670000001", quartier: "Odza", adresse: "r", points: 0, commandes: 0, niveau: "Bronze", passwordHash: "x:y" });
const liv = await Store.insert("livreurs", { matricule: "DRV-9", nom: "Liv", tel: "670000002", vehicule: "Moto", statut: "disponible", passwordHash: "x:y" }).catch(async (e) => { console.log("livreur schema:", e.message); throw e; });
const sub = (channel, token) => Store.insert("pushSubs", { channel, endpoint: "fcm:" + token, p256dh: "native", authKey: "native" });
await sub("admin", "admin-token-0123456789abcdef"); await sub(`client:${cli.id}`, "client-token-0123456789abcdef"); await sub(`livreur:${liv.id}`, "livreur-token-0123456789abc");
await sub("admin", "dead-token-0123456789abcdefghij");           // appareil désinstallé : doit être supprimé
const mk = (o) => Store.insert("orders", { userId: cli.id, items: [{ productId: 1, name: "x", price: 1500, qty: 1 }], total: 2500, adresse: "r", quartier: "Odza", etaMinutes: 25, createdAt: ago(1), fraisLivraison: 1000, discount: 0, tip: 0, paymentMethod: "cash", paymentStatus: "a_la_livraison", ...o });

const o1 = await mk({ statut: "en_preparation", createdAt: ago(11) });                                  // sans livreur depuis 11 min
const o2 = await mk({ statut: "assignee", livreurId: liv.id, assignedAt: ago(5.5) });                     // pas acceptée depuis 5,5 min
const o3 = await mk({ statut: "en_livraison", livreurId: liv.id, startedAt: ago(7) });                    // GPS muet depuis 7 min
const o4 = await mk({ statut: "en_attente_paiement", paymentMethod: "momo", paymentStatus: "en_attente", createdAt: ago(20) });
const o5 = await mk({ statut: "en_preparation", paymentMethod: "momo", paymentStatus: "a_verifier", paymentRef: "MP1234", createdAt: ago(12) });
const o6 = await mk({ statut: "en_preparation", livreurId: liv.id, scheduledFor: new Date(Date.now() + 30 * 60000).toISOString() });
const o7 = await mk({ statut: "livree", confirmedAdminAt: ago(40), rating: null });
const o8 = await mk({ statut: "en_attente_paiement", paymentMethod: "momo", paymentStatus: "en_attente", createdAt: ago(130) });
const tr = await Store.insert("traiteurRequests", { userId: cli.id, nom: "Marie", tel: "670000009", typeEvenement: "Mariage", nbPersonnes: 50, statut: "nouvelle", createdAt: ago(100) });
await Store.insert("traiteurMessages", { requestId: tr.id, sender: "client", text: "Bonjour ?", createdAt: ago(45) });

const r1 = await runAll(); console.log("1re passe:", JSON.stringify(r1));
const by = (tok) => sent.filter((m) => m.token.startsWith(tok));
const titles = (tok) => by(tok).map((m) => m.notification.title);
t("admin alerté : commande sans livreur", by("admin-token").some((m) => m.notification.body.includes(`CMD-${o1.id}`) && m.notification.body.includes("10 min")), titles("admin-token"));
t("livreur relancé : livraison non acceptée", by("livreur-token").some((m) => m.notification.title.includes("Livraison en attente") && m.notification.body.includes(`CMD-${o2.id}`)), titles("livreur-token"));
t("admin alerté : livreur sans réponse (≥5 min)", by("admin-token").some((m) => m.notification.title.includes("Livreur sans réponse")));
t("livreur averti : GPS muet", by("livreur-token").some((m) => m.notification.title.includes("Position non reçue")));
t("admin alerté : GPS muet (≥6 min)", by("admin-token").some((m) => m.notification.title.includes("sans signal GPS")));
t("client rappelé : paiement en attente", by("client-token").some((m) => m.notification.title.includes("Paiement en attente") && m.notification.body.includes(`CMD-${o4.id}`)));
t("admin relancé : paiement à vérifier", by("admin-token").some((m) => m.notification.title.includes("Paiement à vérifier") && m.notification.body.includes("MP1234")));
t("admin + client : commande programmée", by("admin-token").some((m) => m.notification.title.includes("programmée")) && by("client-token").some((m) => m.notification.title.includes("approche")));
t("client : demande d'avis après livraison", by("client-token").some((m) => m.notification.title.includes("Comment était")));
t("admin : client traiteur sans réponse", by("admin-token").some((m) => m.notification.title.includes("traiteur")));
const cancelled = await Store.findById("orders", o8.id);
t("commande impayée 130 min → annulée automatiquement", cancelled.statut === "annulee", cancelled.statut);
t("client prévenu de l'annulation automatique", by("client-token").some((m) => m.notification.title.includes("annulée")));
const subs = await Store.all("pushSubs");
t("appareil désinstallé (UNREGISTERED) supprimé de la base", !subs.some((s) => s.endpoint.startsWith("fcm:dead")), subs.map((s) => s.endpoint.slice(0, 12)));

// ── idempotence : 2e passe immédiate = aucune nouvelle notification
const before = sent.length; const r2 = await runAll();
t(`2e passe : AUCUNE alerte en double (${sent.length - before} nouvelles)`, sent.length === before, r2);

// ── format FCM natif
const m = by("admin-token")[0];
t("FCM : priorité HAUTE + canal Android + jeton Bearer", m.android.priority === "HIGH" && /cloclo-(alerts|urgent)/.test(m.android.notification.channel_id) && m.auth === "Bearer AT123", m);
t("FCM : lien (url) transmis dans data pour l'ouverture au clic", typeof m.data.url === "string" && m.data.url.startsWith("/"), m.data);
const assertion = new URLSearchParams(tokenCalls[0].body.toString()).get("assertion");
const [h, b, s] = assertion.split(".");
const valid = crypto.createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, s, "base64url");
t("FCM : JWT du compte de service correctement signé (RS256)", valid && JSON.parse(Buffer.from(b, "base64url")).scope.includes("firebase.messaging"));
t("FCM : jeton d'accès mis en cache (1 seule demande à Google)", tokenCalls.length === 1, tokenCalls.length);

// ── qui reçoit quoi
const names = (ev, o) => pushPlan(ev, o).map(([c]) => c).sort().join(",");
t("order:assigned → seulement le livreur", names("order:assigned", { id: 1, livreurId: 5, userId: 9 }) === "livreur:5");
t("order:new → seulement l'admin", names("order:new", { id: 1, total: 100, livreurId: 5, userId: 9 }) === "admin");
t("chat envoyé par le client → jamais renvoyé au client", names("order:message", { id: 1, livreurId: 5, userId: 9, message: { sender: "client", text: "yo" } }) === "admin,livreur:5");
t("order:started → seulement le client", names("order:started", { id: 1, livreurId: 5, userId: 9 }) === "client:9");
console.log(`\n${ok} OK / ${ko} KO`);
process.exit(0);
