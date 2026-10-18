
/* =====================================================
   GEMINI AI ASSISTANT PWA
   Chat, Local Storage, Offline Status, PWA Install
   ===================================================== */

"use strict";

// ---------- DOM ELEMENTS ----------
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const conversation = document.getElementById("conversation");
const sendBtn = document.getElementById("sendBtn");
const offlineNotice = document.getElementById("offlineNotice");
const installBtn = document.getElementById("installBtn");

// ---------- SETTINGS ----------
const CHAT_STORAGE_KEY = "gemini-assistant-conversations";
const MAX_SAVED_MESSAGES = 200;

let messages = [];
let isSending = false;
let installPrompt = null;

// ---------- SAFE LOCAL STORAGE ----------

function loadSavedMessages() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      console.warn("Saved conversations have an invalid format.");
      return [];
    }

    return parsed
      .filter((item) =>
        item &&
        typeof item.content === "string" &&
        ["user", "assistant"].includes(item.role)
      )
      .slice(-MAX_SAVED_MESSAGES);

  } catch (error) {
    console.error("Unable to load conversations:", error);
    return [];
  }
}

function saveMessages() {
  try {
    const recentMessages = messages.slice(-MAX_SAVED_MESSAGES);

    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(recentMessages)
    );

    messages = recentMessages;
    return true;

  } catch (error) {
    console.error("Unable to save conversations:", error);
    return false;
  }
}

function saveMessage(content, role) {
  messages.push({
    role: role,
    content: String(content),
    timestamp: new Date().toISOString()
  });

  return saveMessages();
}

// ---------- DISPLAY MESSAGES ----------

function addMessage(text, who, options = {}) {
  if (!conversation) return null;

  const row = document.createElement("div");

  row.className =
    "message " +
    (who === "user" ? "user-message" : "assistant-message");

  if (who !== "user") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "\u2726";
    row.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = String(text);

  if (options.typing) {
    bubble.classList.add("typing");
  }

  row.appendChild(bubble);
  conversation.appendChild(row);

  row.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  return row;
}

function renderSavedMessages() {
  if (!conversation) return;

  conversation.replaceChildren();

  if (messages.length === 0) {
    addMessage(
      "Hello! I'm your AI assistant. Ask me a question to get started.",
      "assistant"
    );
    return;
  }

  messages.forEach((item) => {
    addMessage(item.content, item.role);
  });
}

// ---------- ONLINE / OFFLINE STATUS ----------

function updateOnlineStatus() {
  if (!offlineNotice) return;

  const online = navigator.onLine;

  offlineNotice.hidden = online;

  if (!online) {
    offlineNotice.textContent =
      "You're offline. Saved conversations are available, " +
      "but new AI responses require a connection.";
  } else {
    offlineNotice.textContent =
      "You're online.";
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

// ---------- INPUT RESIZING AND ENTER KEY ----------

if (input) {
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height =
      Math.min(input.scrollHeight, 150) + "px";
  });

  input.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();

      if (form && typeof form.requestSubmit === "function") {
        form.requestSubmit();
      }
    }
  });
}

// ---------- SUGGESTION BUTTONS ----------

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    if (!input) return;

    input.value = button.dataset.prompt || "";
    input.focus();
    input.dispatchEvent(new Event("input"));
  });
});

// ---------- DJANGO CSRF TOKEN ----------

function getCSRFToken() {
  const csrfInput = document.querySelector(
    '[name="csrfmiddlewaretoken"]'
  );

  if (csrfInput && csrfInput.value) {
    return csrfInput.value;
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrftoken="));

  if (!cookie) return "";

  try {
    return decodeURIComponent(
      cookie.substring("csrftoken=".length)
    );
  } catch {
    return cookie.substring("csrftoken=".length);
  }
}

// ---------- CHAT API REQUEST ----------

async function sendMessageToAPI(message) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  const csrf = getCSRFToken();

  if (csrf) {
    headers["X-CSRFToken"] = csrf;
  }

  const response = await fetch("/api/chat/", {
    method: "POST",
    headers: headers,
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ message: message })
  });

  // Read the response body exactly once.
  const responseText = await response.text();

  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const errorMessage =
      data.error ||
      data.detail ||
      `HTTP ${response.status}: ${response.statusText}`;

    const error = new Error(errorMessage);
    error.status = response.status;

    throw error;
  }

  if (!data || typeof data.reply !== "string") {
    throw new Error(
      "Invalid server response. Expected a string in data.reply."
    );
  }

  return data.reply;
}

// ---------- ERROR MESSAGE ----------

function getFriendlyError(error) {
  if (!navigator.onLine) {
    return "You are offline. Your message is saved locally. Reconnect to get an AI response.";
  }

  if (error.status === 403) {
    return "Request rejected (403). Refresh the page and try again. Check Django CSRF settings if the problem continues.";
  }

  if (error.status === 400) {
    return "The server rejected the request (400). Check the message format and backend validation.";
  }

  if (error.status === 429) {
    return "Too many requests (429). Please wait a little before trying again.";
  }

  if (error.status === 502) {
    return "The AI server returned 502 Bad Gateway. Check the Django Terminal for the actual Gemini API or backend error.";
  }

  if (error.status >= 500) {
    return `The server encountered an error (${error.status}). Check the Django Terminal for details.`;
  }

  if (error.status) {
    return `Request failed (${error.status}): ${error.message}`;
  }

  return "Could not connect to the server. Check your connection and make sure Django is running.";
}

// ---------- CHAT FORM ----------

if (form && input && conversation && sendBtn) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSending) return;

    const message = input.value.trim();

    if (!message) return;

    // Save and display the user's message.
    saveMessage(message, "user");
    addMessage(message, "user");

    input.value = "";
    input.style.height = "auto";

    // Offline messages are saved, but not sent automatically later.
    if (!navigator.onLine) {
      addMessage(
        "Your message is saved on this device. Reconnect to the internet and send it again to receive an AI answer.",
        "assistant"
      );
      return;
    }

    isSending = true;
    sendBtn.disabled = true;

    const originalButtonText = sendBtn.textContent;
    sendBtn.textContent = "Sending...";

    const loading = addMessage(
      "Thinking...",
      "assistant",
      { typing: true }
    );

    try {
      const reply = await sendMessageToAPI(message);

      if (loading) loading.remove();

      saveMessage(reply, "assistant");
      addMessage(reply, "assistant");

    } catch (error) {
      if (loading) loading.remove();

      console.error("Chat request failed:", error);

      addMessage(
        getFriendlyError(error),
        "assistant"
      );

    } finally {
      isSending = false;
      sendBtn.disabled = false;

      if (originalButtonText !== null) {
        sendBtn.textContent = originalButtonText;
      }

      updateOnlineStatus();

      if (input) input.focus();
    }
  });
} else {
  console.error(
    "Chat initialization failed. Check these HTML IDs:",
    {
      chatForm: !!form,
      messageInput: !!input,
      conversation: !!conversation,
      sendBtn: !!sendBtn
    }
  );
}

// ---------- SERVICE WORKER REGISTRATION ----------
// Register in one place only.
// Remove any duplicate registration code from other scripts.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => {
        console.error("Service worker error:", error);
      });
  });
}

// ---------- PWA INSTALLATION ----------

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;

  if (installBtn) {
    installBtn.hidden = false;
  }
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.warn("PWA installation prompt failed:", error);
    } finally {
      installPrompt = null;
      installBtn.hidden = true;
    }
  });
}

// ---------- INITIALIZE APP ----------

messages = loadSavedMessages();

renderSavedMessages();
updateOnlineStatus();

console.log("Gemini AI Assistant initialized.");
console.log("Saved messages:", messages.length);
