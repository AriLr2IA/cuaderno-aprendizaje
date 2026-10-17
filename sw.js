// Service worker: deja la app disponible sin internet.
// - La página (index.html) se pide primero a internet, para que las actualizaciones lleguen;
//   si no hay conexión, se usa la copia guardada.
// - Los archivos con nombre único (assets/...) se guardan y se sirven de la copia.
const CACHE = "cuaderno-v1";
const PRECARGA = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fuentes y otros sitios: sin tocar

  // la página: internet primero, copia guardada si no hay conexión
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copia));
          return resp;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true }).then((r) => r || caches.match("./")))
    );
    return;
  }

  // el resto: copia guardada primero, y se guarda lo nuevo
  event.respondWith(
    caches.match(req).then(
      (guardado) =>
        guardado ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        })
    )
  );
});
