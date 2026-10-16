const B=process.env.API || "http://localhost:4000/api";
const call=async(m,p,body,tok,ip)=>{const r=await fetch(B+p,{method:m,headers:{"Content-Type":"application/json",...(ip?{"X-Forwarded-For":ip}:{}),...(tok?{Authorization:"Bearer "+tok}:{})},body:body?JSON.stringify(body):undefined});return {s:r.status,d:await r.json().catch(()=>null)}};
let ok=0,ko=0;const t=(n,c,x)=>{c?ok++:ko++;console.log(c?"✅":"❌",n,c?"":JSON.stringify(x))};
const A=(await call("POST","/auth/login/admin",{username:"admin",mdp:"adminpass1"})).d.token;
const c=(await call("POST","/auth/register",{nom:"Rita Test",email:"rita@x.cm",tel:"+237 670 000 777",mdp:"password1"},null,"9.9.9.1")).d;

// ── limitation des essais
let last; for(let i=1;i<=7;i++){ last=await call("POST","/auth/login/client",{email:"rita@x.cm",mdp:"faux"+i},null,"9.9.9.2"); }
t("7e mauvais essai → 429 « trop de tentatives » avec délai",last.s===429&&/Trop de tentatives/.test(last.d.error)&&last.d.error.includes("minute"),last);
const good=await call("POST","/auth/login/client",{email:"rita@x.cm",mdp:"password1"},null,"9.9.9.2");
t("compte verrouillé : même le BON mot de passe est refusé (anti-devinette)",good.s===429,good);
const other=await call("POST","/auth/login/client",{email:"rita@x.cm",mdp:"password1"},null,"8.8.8.8");
t("verrou lié au COMPTE : autre IP aussi refusée",other.s===429,other);
const innocent=await call("POST","/auth/login/client",{email:"autre@x.cm",mdp:"x"},null,"9.9.9.2");
t("autre compte depuis la même IP : pas encore bloqué (401 normal)",innocent.s===401,innocent);
for(let i=0;i<31;i++) last=await call("POST","/auth/login/client",{email:`u${i}@x.cm`,mdp:"x"},null,"7.7.7.7");
t("balayage de comptes depuis une IP → bloqué (429)",last.s===429,last);
const admOk=await call("POST","/auth/login/admin",{username:"admin",mdp:"adminpass1"},null,"6.6.6.6");
t("l'admin légitime n'est pas touché",admOk.s===200,admOk);

// ── mot de passe oublié
const unk=await call("POST","/auth/forgot",{identifier:"inconnu@x.cm"},null,"5.5.5.1");
const kn=await call("POST","/auth/forgot",{identifier:"670000777"},null,"5.5.5.2");   // par téléphone, format différent
t("réponse IDENTIQUE compte inconnu / connu (pas de fuite)",unk.s===200&&kn.s===200&&unk.d.message===kn.d.message,{unk:unk.d,kn:kn.d});
let list=(await call("GET","/admin/password-resets",null,A)).d;
t("l'admin voit UNE demande (téléphone retrouvé malgré le format)",list.length===1&&list[0].nom==="Rita Test"&&list[0].status==="en_attente",list);
t("pas de code tant que l'admin n'a rien déclenché",!JSON.stringify(list).includes("code"),list);
const noAuth=await call("GET","/admin/password-resets",null,c.token); t("un client ne peut PAS lister les demandes",noAuth.s===403,noAuth);
const dup=await call("POST","/auth/forgot",{identifier:"rita@x.cm"},null,"5.5.5.3");
list=(await call("GET","/admin/password-resets",null,A)).d; t("demande en double ignorée (toujours 1)",list.length===1,list);
const early=await call("POST","/auth/reset",{identifier:"rita@x.cm",code:"123456",mdp:"nouveau123"},null,"5.5.5.4");
t("code saisi avant émission → refusé",early.s===400,early);
const issued=(await call("POST",`/admin/password-resets/${list[0].id}/issue`,{},A)).d;
t("code 6 chiffres + lien WhatsApp vers le numéro ENREGISTRÉ",/^\d{6}$/.test(issued.code)&&issued.whatsappUrl.includes("phone=237670000777")&&decodeURIComponent(issued.whatsappUrl).includes(issued.code),issued);
const short=await call("POST","/auth/reset",{identifier:"rita@x.cm",code:issued.code,mdp:"court"},null,"5.5.5.5"); t("nouveau mot de passe trop court refusé",short.s===400,short);
let wrong; for(let i=0;i<5;i++) wrong=await call("POST","/auth/reset",{identifier:"rita@x.cm",code:"000000",mdp:"nouveau123"},null,"5.5.5.6");
const afterLock=await call("POST","/auth/reset",{identifier:"rita@x.cm",code:issued.code,mdp:"nouveau123"},null,"5.5.5.7");
t("5 mauvais codes → code invalidé (même le bon est refusé ensuite)",afterLock.s===400||afterLock.s===429,afterLock);
// nouvelle demande complète
await call("POST","/admin/password-resets/"+list[0].id+"/dismiss",{},A);
const kn2=await call("POST","/auth/forgot",{identifier:"rita@x.cm"},null,"4.4.4.1");
list=(await call("GET","/admin/password-resets",null,A)).d;
t("après annulation, une nouvelle demande peut être faite",list.length===1,{kn2,list});
const issued2=(await call("POST",`/admin/password-resets/${list[0].id}/issue`,{},A)).d;
const done=await call("POST","/auth/reset",{identifier:"rita@x.cm",code:issued2.code,mdp:"nouveau123"},null,"4.4.4.2");
t("bon code + nouveau mot de passe → réinitialisé",done.s===200&&done.d.ok,done);
const reuse=await call("POST","/auth/reset",{identifier:"rita@x.cm",code:issued2.code,mdp:"autrepass99"},null,"4.4.4.3");
t("code à usage UNIQUE (rejoué = refusé)",reuse.s===400,reuse);
console.log(`\n${ok} OK / ${ko} KO`);
