// sw.js - Place this file in the ROOT of your repository
const CACHE_NAME = 'kiddoverse-cache-v3'; // Increment if you make significant changes
const URLS_TO_CACHE = [
    '/', '/index.html', '/style.css', '/three.min.js', '/utils.js', '/noise.js',
    '/blocks.js', '/audio.js', '/world.js', '/player.js', '/controls.js', '/ui.js',
    '/main.js', '/manifest.json',
    '/assets/images/logo192.png', '/assets/images/logo512.png', '/assets/images/favicon.ico',
    // Add actual external texture PNG paths if you use any, e.g., '/assets/images/textures/grass_top.png'
    '/assets/sounds/place.ogg', '/assets/sounds/remove_block.mp3', '/assets/sounds/jump.ogg'
];
self.addEventListener('install',event=>{console.log(`KV SW (${CACHE_NAME}): Install`);self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache=>{console.log(`KV SW (${CACHE_NAME}): Caching core assets.`);const cachePromises=URLS_TO_CACHE.map(urlToCache=>{return cache.add(new Request(urlToCache,{cache:'reload'})).catch(err=>console.warn(`SW Cache failed for ${urlToCache}:`,err));});return Promise.all(cachePromises);}).catch(err=>console.error(`KV SW (${CACHE_NAME}): Failed to open cache during install:`,err)));});
self.addEventListener('activate',event=>{console.log(`KV SW (${CACHE_NAME}): Activate`);event.waitUntil(caches.keys().then(cacheNames=>{return Promise.all(cacheNames.map(cacheName=>{if(cacheName!==CACHE_NAME){console.log(`KV SW (${CACHE_NAME}): Deleting old cache:`,cacheName);return caches.delete(cacheName);}}));}).then(()=>{console.log(`KV SW (${CACHE_NAME}): Claiming clients.`);return self.clients.claim();}));});
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{if(response&&response.ok&&event.request.method==='GET'){const responseToCache=response.clone();caches.open(CACHE_NAME).then(cache=>{cache.put(event.request,responseToCache);});}return response;}).catch(()=>{return caches.match(event.request).then(cachedResponse=>{return cachedResponse||caches.match('/index.html');});}));return;}event.respondWith(caches.match(event.request).then(cachedResponse=>{return cachedResponse||fetch(event.request).then(networkResponse=>{if(networkResponse&&networkResponse.ok&&event.request.method==='GET'){const responseToCache=networkResponse.clone();caches.open(CACHE_NAME).then(cache=>{cache.put(event.request,responseToCache);});}return networkResponse;}).catch(error=>console.warn(`KV SW: Fetch failed for ${event.request.url}. Error:`,error));}));});
