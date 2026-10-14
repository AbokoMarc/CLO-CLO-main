import json,time,urllib.request
from playwright.sync_api import sync_playwright
H="http://localhost:8099/"; res=[]
def t(n,c): res.append(("✅" if c else "❌")+" "+n)
def api(m,p,body=None):
    rq=urllib.request.Request("http://localhost:4000/api"+p,data=json.dumps(body).encode() if body is not None else None,method=m,headers={"Content-Type":"application/json"})
    return json.load(urllib.request.urlopen(rq))
em=f"net{int(time.time())}@x.cm"; api("POST","/auth/register",{"nom":"Net Client","email":em,"tel":"670000321","mdp":"password1"})
cfg=open('/home/claude/proj/CLO-CLO-main-main/config.js').read()
# simule un site en ligne : isLocal=false, API directe = backend local, délais courts
cfg=cfg.replace('const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";','const isLocal = false;')
cfg=cfg.replace('"https://clo-clo-main.onrender.com/api"','"http://localhost:4000/api"').replace('{ proxy: 20000, direct: 50000 }','{ proxy: 1500, direct: 3000 }')
def run(b,name,proxy,direct,expect_ok,fonts_hang=False,show=False):
    c=b.new_context(viewport={"width":390,"height":844},is_mobile=True)
    pg=c.new_page(); log=[]
    pg.route("**/config.js",lambda r: r.fulfill(body=cfg,content_type="application/javascript"))
    def px(r):
        log.append("proxy")
        if proxy=="ok": 
            req=urllib.request.Request("http://localhost:4000"+r.request.url.split("localhost:8099")[1],data=r.request.post_data_buffer,method=r.request.method,headers={"Content-Type":"application/json"})
            try: resp=urllib.request.urlopen(req); r.fulfill(status=resp.status,body=resp.read(),content_type="application/json")
            except urllib.error.HTTPError as e: r.fulfill(status=e.code,body=e.read(),content_type="application/json")
        elif proxy=="html404": r.fulfill(status=404,body="<html>Not found</html>",content_type="text/html")
        elif proxy=="hang": pass
        else: r.abort()
    pg.route("**localhost:8099/api/**",px)
    def dr(r):
        log.append("direct")
        if direct=="ok": r.continue_()
        elif direct=="hang": pass
        else: r.abort()
    pg.route("http://localhost:4000/**",dr)
    if fonts_hang: pg.route("**fonts.googleapis.com/**",lambda r: None)
    pg.goto(H+"connexion.html"); pg.wait_for_timeout(500)
    pg.fill("#input-email",em); pg.fill("#input-mdp","password1"); pg.click("#btn-login")
    t0=time.time()
    try:
        pg.wait_for_url("**/index.html*",timeout=22000) if False else pg.wait_for_function("location.pathname.includes('profil')||location.pathname.includes('index')||document.getElementById('net-error')",timeout=22000)
    except Exception: pass
    dt=time.time()-t0; ok=("profil" in pg.url or "index" in pg.url)
    t(f"{name} → {'connecté' if ok else 'échec'} en {dt:.1f}s (attendu: {'connecté' if expect_ok else 'message réseau'})", ok==expect_ok)
    if not expect_ok:
        t(f"{name} : message réseau en bandeau (pas sous le mot de passe)", pg.locator("#net-error").count()==1 and not pg.inner_text("#err-mdp").strip())
        t(f"{name} : bouton réactivé pour réessayer", not pg.locator("#btn-login").is_disabled())
    if show: pg.screenshot(path="/tmp/bt/shots/net-error.png")
    c.close(); return log
with sync_playwright() as p:
    b=p.chromium.launch()
    run(b,"S1 proxy OK, direct bloqué","ok","abort",True)
    run(b,"S2 proxy absent (404 HTML), direct OK","html404","ok",True)
    run(b,"S3 proxy muet (délai), direct OK","hang","ok",True)
    run(b,"S4 tout injoignable","abort","abort",False,show=True)
    # S5 : Google Fonts qui ne répond jamais → la page doit quand même s'afficher vite
    c=b.new_context(viewport={"width":390,"height":844},is_mobile=True); pg=c.new_page()
    pg.route("**fonts.googleapis.com/**",lambda r: None); pg.route("**fonts.gstatic.com/**",lambda r: None)
    pg.goto(H+"connexion.html",wait_until="commit"); pg.wait_for_timeout(3000)
    fcp=pg.evaluate("performance.getEntriesByName('first-contentful-paint')[0]?.startTime||null")
    t(f"S5 polices Google bloquées : la page s'affiche quand même (FCP {fcp and round(fcp)} ms)", fcp is not None and fcp<3000)
    c.close(); b.close()
print("\n".join(res))
