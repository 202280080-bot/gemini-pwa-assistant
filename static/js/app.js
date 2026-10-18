const form = document.getElementById('chatForm');
const input = document.getElementById('messageInput');
const conversation = document.getElementById('conversation');
const sendBtn = document.getElementById('sendBtn');
const offlineNotice = document.getElementById('offlineNotice');
const installBtn = document.getElementById('installBtn');
let installPrompt = null;

function addMessage(text, who) {
  const row = document.createElement('div');
  row.className = `message ${who === 'user' ? 'user-message' : 'assistant-message'}`;
  if (who !== 'user') {
    const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = '✦'; row.appendChild(avatar);
  }
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  row.appendChild(bubble); conversation.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return row;
}
function updateOnlineStatus() { offlineNotice.hidden = navigator.onLine; }
updateOnlineStatus(); window.addEventListener('online', updateOnlineStatus); window.addEventListener('offline', updateOnlineStatus);

input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 150)}px`; });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.prompt; input.focus(); input.dispatchEvent(new Event('input')); }));

form.addEventListener('submit', async event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  addMessage(message, 'user'); input.value = ''; input.style.height = 'auto';
  if (!navigator.onLine) { addMessage('You are offline. Reconnect to the internet and send your question again.', 'assistant'); return; }
  sendBtn.disabled = true;
  const loading = addMessage('Thinking…', 'assistant'); loading.querySelector('.bubble').classList.add('typing');
  try {
    const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const response = await fetch('/api/chat/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf }, body: JSON.stringify({ message }) });
    const data = await response.json(); loading.remove();
    if (!response.ok) addMessage(data.error || 'Something went wrong. Please try again.', 'assistant');
    else addMessage(data.reply, 'assistant');
  } catch (error) {
    loading.remove(); addMessage('I could not reach the server. Check that the Django server is running and that you have internet access.', 'assistant');
  } finally { sendBtn.disabled = false; input.focus(); }
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(err => console.log('Service worker registration failed:', err)));
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installBtn.hidden = false; });
installBtn.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installBtn.hidden = true; });
