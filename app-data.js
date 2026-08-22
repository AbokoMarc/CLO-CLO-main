/* ============================================================
   CLO-CLO | app-data.js — Données globales + localStorage
   ============================================================ */
const APP = {

  user: {
    nom: "Marie Kambale",
    email: "marie.kambale@email.com",
    tel: "+243 987 654 321",
    adresse: "456 Avenue Kasa-Vubu, Kinshasa",
    points: 350,
    commandes: 24,
    niveau: "Or",
    connecte: true,
  },

  cart: [],

  orders: [],

  products: [
    { id:1, name:"Jus d'Orange Pressé",       price:3000, category:"jus",       popular:true,  desc:"Oranges fraîches pressées à la minute",        img:"https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&q=80" },
    { id:2, name:"Smoothie Tropical",          price:4500, category:"smoothies", popular:true,  desc:"Mangue, ananas, banane et lait de coco",        img:"https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80" },
    { id:3, name:"Glace Vanille",              price:2500, category:"glaces",    popular:false, desc:"Glace artisanale à la vanille de Madagascar",   img:"https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&q=80" },
    { id:4, name:"Salade de Fruits Exotiques", price:3500, category:"salades",   popular:true,  desc:"Ananas, mangue, papaye, fruits de la passion",  img:"https://images.unsplash.com/photo-1568158879083-c42860933ed7?w=600&q=80" },
    { id:5, name:"Jus de Pastèque",            price:2800, category:"jus",       popular:false, desc:"Pastèque fraîche avec menthe",                  img:"https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&q=80" },
    { id:6, name:"Smoothie Berry",             price:4200, category:"smoothies", popular:false, desc:"Fraises, framboises, myrtilles et yaourt",      img:"https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80" },
    { id:7, name:"Glace Chocolat",             price:2800, category:"glaces",    popular:false, desc:"Glace onctueuse au chocolat belge",              img:"https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&q=80" },
    { id:8, name:"Salade Tropicale",           price:3200, category:"salades",   popular:false, desc:"Fruits tropicaux avec sirop de citron vert",    img:"https://images.unsplash.com/photo-1568158879083-c42860933ed7?w=600&q=80" },
  ],

  rewards: [
    { id:1, name:"Boisson Gratuite",   desc:"Un jus ou smoothie de votre choix", cost:150, available:true  },
    { id:2, name:"Réduction 20%",      desc:"Sur votre prochaine commande",       cost:100, available:true  },
    { id:3, name:"Livraison Gratuite", desc:"Pour votre prochaine commande",      cost:50,  available:true  },
    { id:4, name:"Menu VIP",           desc:"Accès aux produits exclusifs",       cost:500, available:false },
  ],

  pointsHistory: [
    { label:"Commande #CMD-2026-001", date:"15 Mars 2026", pts:+50,  type:"gain" },
    { label:"Bonus de parrainage",    date:"10 Mars 2026", pts:+100, type:"gain" },
    { label:"Récompense utilisée",    date:"8 Mars 2026",  pts:-75,  type:"loss" },
    { label:"Commande #CMD-2026-002", date:"5 Mars 2026",  pts:+40,  type:"gain" },
    { label:"Commande #CMD-2026-003", date:"1 Mars 2026",  pts:+30,  type:"gain" },
  ],

  // Panier
  getCartTotal(){ return this.cart.reduce((s,i)=>s+i.price*i.qty, 0); },
  getCartCount(){ return this.cart.reduce((s,i)=>s+i.qty, 0); },

  addToCart(productId){
    const p = this.products.find(x=>x.id===productId);
    if(!p) return false;
    const ex = this.cart.find(x=>x.id===productId);
    if(ex) ex.qty++;
    else this.cart.push({id:p.id, name:p.name, price:p.price, qty:1, img:p.img});
    this.user.points += 10;
    this.save();
    return true;
  },

  removeFromCart(productId){
    this.cart = this.cart.filter(x=>x.id!==productId);
    this.save();
  },

  updateQty(productId, delta){
    const item = this.cart.find(x=>x.id===productId);
    if(!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if(item.qty === 0) this.cart = this.cart.filter(x=>x.id!==productId);
    this.save();
  },

  clearCart(){ this.cart = []; this.save(); },

  // Commande
  passCommande(adresse){
    const total = this.getCartTotal();
    const articles = this.cart.map(i=>i.name);
    const cmdId = "CMD-2026-" + String(Math.floor(Math.random()*900)+100).padStart(3,"0");
    const order = {
      id: cmdId,
      date: new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}),
      heure: new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),
      articles,
      total,
      adresse: adresse || this.user.adresse,
      statut: "en_preparation",
      eta: 25,
    };
    this.orders.unshift(order);
    const pts = Math.floor(total/500)*5;
    this.user.points += pts;
    this.user.commandes += 1;
    this.pointsHistory.unshift({ label:`Commande #${cmdId}`, date:order.date, pts:+pts, type:"gain" });
    this.clearCart();
    localStorage.setItem("cloclo_last_order", JSON.stringify(order));
    this.save();
    return order;
  },

  getLastOrder(){
    try{ return JSON.parse(localStorage.getItem("cloclo_last_order")||"null"); }catch(e){ return null; }
  },

  useReward(rewardId){
    const r = this.rewards.find(x=>x.id===rewardId);
    if(!r || !r.available || this.user.points < r.cost) return false;
    this.user.points -= r.cost;
    this.pointsHistory.unshift({ label:`Récompense : ${r.name}`, date:new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}), pts:-r.cost, type:"loss" });
    this.save();
    return true;
  },

  // Persistance localStorage
  save(){
    try{
      localStorage.setItem("cloclo_user",   JSON.stringify(this.user));
      localStorage.setItem("cloclo_cart",   JSON.stringify(this.cart));
      localStorage.setItem("cloclo_orders", JSON.stringify(this.orders));
      localStorage.setItem("cloclo_history",JSON.stringify(this.pointsHistory));
    }catch(e){}
  },

  load(){
    try{
      const u = localStorage.getItem("cloclo_user");
      const c = localStorage.getItem("cloclo_cart");
      const o = localStorage.getItem("cloclo_orders");
      const h = localStorage.getItem("cloclo_history");
      if(u) this.user         = {...this.user, ...JSON.parse(u)};
      if(c) this.cart         = JSON.parse(c);
      if(o) this.orders       = JSON.parse(o);
      if(h) this.pointsHistory= JSON.parse(h);
    }catch(e){}
  },

  logout(){
    localStorage.removeItem("cloclo_user");
    localStorage.removeItem("cloclo_cart");
    localStorage.removeItem("cloclo_orders");
    localStorage.removeItem("cloclo_history");
    localStorage.removeItem("cloclo_last_order");
    localStorage.removeItem("cloclo_remember");
    window.location.href = "connexion.html";
  },
};

APP.load();