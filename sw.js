// 앱 셸(정적 파일)만 캐싱 - Supabase/차트 데이터는 항상 네트워크에서 최신으로 가져옴
const CACHE_NAME = 'personnelstatus-shell-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(SHELL_ASSETS); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

// 네트워크 우선(항상 최신 배포본 반영), 오프라인일 때만 캐시된 셸로 폴백
// 외부 CDN(Chart.js 등)은 서비스워커가 가로채지 않고 그대로 네트워크로 보냄
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;

  e.respondWith(
    fetch(e.request).then(function(res){
      var resClone=res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, resClone); });
      return res;
    }).catch(function(){
      return caches.match(e.request);
    })
  );
});
