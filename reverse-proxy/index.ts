import express from "express";
import httpProxy from "http-proxy";

const app = express();
const PORT = 8000;

const BASE_PATH =
  "https://pub-2dd8a37d49b040cd85a891bdd4ddeeb1.r2.dev/__outputs";

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];
  const resolvesTo = `${BASE_PATH}/${subdomain}`;
  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

/*
 *i will enhance more will add database to store subdomain and     their   respective path
 *and will use that path to resolve the request
 *for now i am using static path
 */

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

app.listen(PORT, () => console.log(`Reverse Proxy Running..${PORT}`));
