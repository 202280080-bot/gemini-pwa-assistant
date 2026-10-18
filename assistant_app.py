import json
import os
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def home(request):
    return render(request, 'index.html')

@require_POST
def chat(request):
    try:
        body = json.loads(request.body.decode('utf-8'))
        prompt = str(body.get('message', '')).strip()
        if not prompt:
            return JsonResponse({'error': 'Please type a question first.'}, status=400)
        if len(prompt) > 8000:
            return JsonResponse({'error': 'Please keep your message under 8,000 characters.'}, status=400)
        api_key = os.getenv('GEMINI_API_KEY', '').strip()
        if not api_key:
            return JsonResponse({'error': 'Gemini API key is not set. Add GEMINI_API_KEY to your .env file, then restart the server.'}, status=503)
        from google import genai
        client = genai.Client(api_key=api_key)
        model = os.getenv('GEMINI_MODEL', 'gemini-3.8-flash')
        response = client.models.generate_content(
            model=model,
            contents=(
                'You are a helpful, friendly AI assistant for students. '
                'Explain ideas clearly, use simple language, and give step-by-step examples when useful.\n\n'
                f'User question: {prompt}'
            ),
        )
        answer = getattr(response, 'text', None) or 'Sorry, I could not produce a text answer. Please try again.'
        return JsonResponse({'reply': answer})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'The request was not valid JSON.'}, status=400)
    except Exception as exc:
        # Keep details in server logs; show a friendly message in the browser.
        print('Gemini request failed:', repr(exc))
        return JsonResponse({'error': 'The AI request failed. Check your internet connection, API key, model name, and terminal for details.'}, status=502)

def manifest(request):
    data = {
        'name': 'Gemini AI Assistant',
        'short_name': 'AI Assistant',
        'description': 'A simple student-friendly AI assistant.',
        'start_url': '/',
        'scope': '/',
        'display': 'standalone',
        'background_color': '#f5f7fb',
        'theme_color': '#3458db',
        'icons': [
            {'src': '/static/icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
            {'src': '/static/icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        ],
    }
    return HttpResponse(json.dumps(data), content_type='application/manifest+json')

def service_worker(request):
    js = """
const CACHE_NAME = 'gemini-assistant-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/static/css/styles.css', '/static/js/app.js', '/static/icons/icon-192.png', '/static/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // Network-first for pages so Django can issue a fresh CSRF token; cached page is offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/', response.clone()));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (new URL(request.url).origin === self.location.origin && response.ok) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match('/'))));
});
"""
    return HttpResponse(js, content_type='application/javascript')
