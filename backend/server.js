/* ============================================================
   CLO-CLO Backend | server.js
   Lancement : node server.js  (voir README.md)
   ============================================================ */
import http from "node:http";
import { router } from "./src/routes.js";
import { config } from "./src/config.js";
import { sendJson } from "./src/http.js";
import { runBootstrap } from "./src/bootstrap.js";

runBootstrap();

const server = http.createServer((req, res) => {
  if (req.url === "/api/health") return sendJson(res, 200, { status: "ok", service: "cloclo-backend" });
  router.handle(req, res);
});

server.listen(config.port, () => {
  console.log(`🍹 CLO-CLO backend en écoute sur http://localhost:${config.port}`);
  console.log(`   Test rapide : curl http://localhost:${config.port}/api/health`);
});
