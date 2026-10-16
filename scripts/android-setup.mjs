#!/usr/bin/env node
/* ============================================================
   CLO-CLO | scripts/android-setup.mjs
   Prépare (et construit) l'APK Android Capacitor avec notifications natives + GPS arrière-plan.

   Prérequis sur VOTRE ordinateur : Node 18+, Java 17, Android Studio (SDK Android installé).
   Usage :
     npm install
     node scripts/android-setup.mjs            → crée / met à jour le projet android/
     node scripts/android-setup.mjs --build    → + construit l'APK (android/app/build/outputs/apk/debug/app-debug.apk)

   Avant : placez le fichier Firebase « google-services.json » dans android-config/
   (Firebase → Paramètres du projet → Vos applis → Android, identifiant com.cloclo.app).
   ============================================================ */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const run = (cmd, cwd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: "inherit", cwd }); };
const build = process.argv.includes("--build");

if (!fs.existsSync("android")) run("npx cap add android");
run("npx cap sync android");

// 1) Firebase : sans ce fichier, aucune notification native ne peut arriver.
const gs = path.join("android-config", "google-services.json");
if (fs.existsSync(gs)) { fs.copyFileSync(gs, path.join("android", "app", "google-services.json")); console.log("✅ google-services.json copié."); }
else console.warn("⚠️  android-config/google-services.json ABSENT : l'APK fonctionnera mais SANS notifications push. Voir APK-ANDROID.md.");

// 2) Permissions Android nécessaires (notifications Android 13+, GPS arrière-plan, service de premier plan)
const manifestPath = path.join("android", "app", "src", "main", "AndroidManifest.xml");
let xml = fs.readFileSync(manifestPath, "utf8");
const perms = [
  "android.permission.INTERNET", "android.permission.POST_NOTIFICATIONS", "android.permission.VIBRATE",
  "android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.FOREGROUND_SERVICE", "android.permission.FOREGROUND_SERVICE_LOCATION", "android.permission.WAKE_LOCK",
];
let added = 0;
for (const p of perms) if (!xml.includes(`"${p}"`)) { xml = xml.replace("</manifest>", `    <uses-permission android:name="${p}" />\n</manifest>`); added++; }
fs.writeFileSync(manifestPath, xml);
console.log(`✅ Permissions Android : ${added} ajoutée(s).`);

if (build) {
  const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  run(`${gradle} assembleDebug`, "android");
  console.log("\n🎉 APK : android/app/build/outputs/apk/debug/app-debug.apk");
} else console.log("\nÉtape suivante : npm run android:apk   (ou ouvrez le dossier android/ dans Android Studio : Build → Build APK).");
