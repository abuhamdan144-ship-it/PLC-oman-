self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-only by design: never cache sign-in, profile, card, voting, or incident data.
  event.respondWith(fetch(request));
});
