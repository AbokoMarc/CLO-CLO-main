const B=process.env.API || "http://localhost:4000/api";
const call=async(m,p,body,tok)=>{const r=await fetch(B+p,{method:m,headers:{"Content-Type":"application/json",...(tok?{Authorization:"Bearer "+tok}:{})},body:body?JSON.stringify(body):undefined});let d=null;try{d=await r.json()}catch{};return {s:r.status,d}};
let ok=0,ko=0;const t=(n,c,x)=>{c?ok++:ko++;console.log((c?"✅":"❌"),n,c?"":JSON.stringify(x))};
const adm=(await call("POST","/auth/login/admin",{username:"admin",mdp:"adminpass1"})).d;
const A=adm.token; t("login admin",!!A,adm);
// produits
const p1=(await call("POST","/products",{name:"Jus test",price:1500,category:"jus",desc:"x"},A)).d;
const p2=(await call("POST","/products",{name:"Indispo",price:1000,category:"jus"},A)).d;
await call("PUT","/products/"+p2.id,{...p2,disponible:false},A);
// clients + parrainage
const c1=(await call("POST","/auth/register",{nom:"Marie K",email:"m@x.cm",tel:"670000001",mdp:"password1",quartier:"Odza",adresse:"Rue 1"})).d;
t("inscription client",!!c1.token,c1);
const C=c1.token, uid=c1.user?.id ?? c1.id;
const c2=(await call("POST","/auth/register",{nom:"Paul D",email:"p@x.cm",tel:"670000002",mdp:"password1",codeParrainage:"CL"+uid})).d;
t("inscription avec parrainage",!!c2.token,c2);
const ref=await call("GET","/auth/me/referrals",null,C);
t("stats parrainage",ref.s===200&&ref.d.count===1&&ref.d.pointsEarned===100&&ref.d.code==="CL"+uid,ref);
// commandes : validations
const bad=await call("POST","/orders",{items:[{productId:p1.id,qty:-3}],adresse:"x",quartier:"Odza"},C);
t("quantité négative refusée",bad.s===400,bad);
const bad2=await call("POST","/orders",{items:[{productId:p2.id,qty:1}],adresse:"x",quartier:"Odza"},C);
t("produit indisponible refusé",bad2.s===409,bad2);
// idempotence
const body={items:[{productId:p1.id,qty:2},{productId:p1.id,qty:1}],adresse:"Rue 1",quartier:"Odza",idempotencyKey:"k-123"};
const [o1,o2]=await Promise.all([call("POST","/orders",body,C),call("POST","/orders",body,C)]);
t("double envoi → une seule commande",o1.d?.id===o2.d?.id && o1.d.items[0].qty===3,{o1:o1.d?.id,o2:o2.d?.id});
const mine=(await call("GET","/orders/me",null,C)).d; t("1 commande en base",mine.length===1,mine.length);
// points puis annulation
const before=(await call("GET","/auth/me",null,C)).d.points;
const can=await call("PATCH",`/orders/${o1.d.id}/cancel`,{},C);
const after=(await call("GET","/auth/me",null,C)).d;
t("annulation reprend les points",can.s===200&&after.points<before,{before,after:after.points});
// paiement
const pm=(await call("GET","/payments/methods")).d; t("méthodes de paiement (manuel)",pm.mode==="manual"&&pm.methods.some(m=>m.id==="momo"),pm);
const bad3=await call("POST","/orders",{items:[{productId:p1.id,qty:1}],adresse:"R",quartier:"Odza",paymentMethod:"paypal"},C);
t("méthode non configurée refusée",bad3.s===400,bad3);
const op=(await call("POST","/orders",{items:[{productId:p1.id,qty:1}],adresse:"R",quartier:"Odza",paymentMethod:"momo",idempotencyKey:"k-pay"},C)).d;
t("commande en ligne en attente de paiement",op.statut==="en_attente_paiement"&&op.paymentStatus==="en_attente",op);
const init=(await call("POST",`/orders/${op.id}/pay`,{},C)).d; t("instructions de paiement manuel",init.mode==="manual"&&init.number==="670000000"&&init.amount===op.total,init);
const dec=await call("POST",`/orders/${op.id}/pay/declare`,{reference:"MP260101.1234"},C); t("référence déclarée",dec.d?.paymentStatus==="a_verifier",dec);
const val=await call("POST",`/admin/orders/${op.id}/payment/validate`,{},A); t("admin valide → en préparation",val.d?.order?.statut==="en_preparation"&&val.d.order.paymentStatus==="paye",val);
const forged=await call("POST",`/admin/orders/${op.id}/payment/validate`,{},C); t("client ne peut pas valider",forged.s===403,forged);
// traiteur messagerie
const tr=(await call("POST","/traiteur",{nom:"Marie K",tel:"670000001",typeEvenement:"Mariage",nbPersonnes:80,message:"Bonjour"},C)).d; t("demande traiteur",!!tr.id,tr);
const mm=await call("POST",`/traiteur/${tr.id}/messages`,{text:"Quel est le prix ?"},C); t("client écrit",mm.s===201,mm);
const lst=(await call("GET","/admin/traiteur",null,A)).d; t("admin voit 1 non lu",lst[0].unreadForAdmin===1&&lst[0].lastMessage.text.includes("prix"),lst[0]);
const ra=await call("POST",`/traiteur/${tr.id}/messages`,{text:"Bonjour, voici notre offre"},A); t("admin répond",ra.s===201&&ra.d.sender==="admin",ra);
const thread=(await call("GET",`/traiteur/${tr.id}/messages`,null,A)).d; t("fil lu par admin",thread.length===2,thread);
const mine2=(await call("GET","/traiteur/me",null,C)).d; t("client voit 1 non lu",mine2[0].unreadForClient===1,mine2[0]);
await call("PATCH","/admin/traiteur/"+tr.id,{prixPropose:250000,statut:"negociation"},A);
const thread2=(await call("GET",`/traiteur/${tr.id}/messages`,null,C)).d; t("prix proposé ajouté au fil",thread2.some(m=>m.text.includes("250")),thread2);
const other=(await call("POST","/auth/login/client",{email:"p@x.cm",mdp:"password1"})).d;
const spy=await call("GET",`/traiteur/${tr.id}/messages`,null,other.token); t("autre client refusé",spy.s===403,spy);
const anon=await call("GET",`/traiteur/${tr.id}/messages`); t("anonyme refusé",anon.s===401,anon);
const empty=await call("POST",`/traiteur/${tr.id}/messages`,{text:"   "},C); t("message vide refusé",empty.s===400,empty);
console.log(`\n${ok} OK / ${ko} KO`);
