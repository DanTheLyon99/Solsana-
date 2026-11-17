import { spawn } from "child_process";
import { once } from "events";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9333;
const userData = fs.mkdtempSync(path.join(os.tmpdir(), "solsana-chrome-"));
const child = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userData}`,
  "--headless=new",
  "--disable-gpu",
  "about:blank",
], { stdio: "ignore" });

function rpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ id: 1, method, params });
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/json/runtime/evaluate",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

await new Promise((r) => setTimeout(r, 1200));
const list = await new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => resolve(JSON.parse(data)));
  }).on("error", reject);
});
const page = list.find((t) => t.type === "page") || list[0];
const wsUrl = page.webSocketDebuggerUrl;
const WebSocket = (await import("node:http")).default;
console.log("TARGET", wsUrl || page.id);

const wsMod = await import("ws").catch(() => null);
if (!wsMod) {
  console.log("NO_WS");
  child.kill();
  process.exit(0);
}
