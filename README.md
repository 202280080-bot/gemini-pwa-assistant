# Gemini AI Assistant PWA (Django)

A beginner-friendly school project based on the assignment screenshot. It uses Django as the backend, HTML/CSS/Bootstrap and JavaScript for the interface, the Google Gemini API for answers, and a manifest + service worker for basic PWA installation/offline app-shell support.

## Important notes
- The Gemini API key is read only by Python on the server from `.env`. It is never placed in browser JavaScript.
- The interface can open while offline after it has been cached, but Gemini answers require an internet connection.
- This starter app does not save chat history in a database.
- The app shell uses Bootstrap from a CDN; for a fully offline appearance, download Bootstrap locally and update the stylesheet link.

## Step-by-step setup (Windows)

### 1. Install Python
Install Python 3.11 or newer from https://www.python.org/downloads/. During installation, tick **Add Python to PATH**. Open Command Prompt and check:

```bat
python --version
```

### 2. Open this project folder
Extract the ZIP file. Open the extracted `gemini_pwa_assistant` folder. In File Explorer, click the address bar, type `cmd`, and press Enter. Command Prompt should open inside the project folder.

### 3. Create a virtual environment

```bat
python -m venv .venv
.venv\Scripts\activate
```

If activation is blocked in PowerShell, use Command Prompt as above, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell only if you understand and are allowed to change that setting.

### 4. Install the required libraries

```bat
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Get a Gemini API key
Open https://aistudio.google.com/app/apikey, sign in, and create an API key if API access is available to your account. Follow Google's current terms and usage limits. Do not post the key in screenshots, public repositories, or browser JavaScript.

### 6. Create your private `.env` file
In the project folder, copy `.env.example` and rename the copy to `.env` (make sure it is not named `.env.txt`). Open `.env` in Notepad and replace `paste_your_real_api_key_here` with your actual key. Keep the rest as shown. Save the file.

### 7. Start Django

```bat
python manage.py runserver
```

If you see a message saying the development server is running at `http://127.0.0.1:8000/`, leave that Command Prompt open.

### 8. Open the app
Open Chrome or Edge and visit http://127.0.0.1:8000/. Type a question and press Enter or click the blue send arrow. Try a prompt like: **Explain binary numbers in simple words and give one example.**

### 9. Test the PWA
Use Chrome or Edge at `http://127.0.0.1:8000/`. The browser may show an install icon or the **Install app** button after the app meets its installability checks. Installability can vary by browser version. For a real public deployment, use HTTPS.

### 10. Test offline behavior
First load the page while online and wait a moment for the service worker to cache the app shell. Then turn off your internet and reload. The interface may still open from cache, but it cannot ask Gemini for new answers while offline. Turn internet back on to use AI again.

## What each important file does
- `manage.py`: starts Django commands and the local server.
- `config.py`: Django configuration and loads `.env` variables.
- `urls.py`: maps website and API paths to Python functions.
- `assistant_app.py`: displays the page and calls Gemini from the server.
- `templates/index.html`: visible app structure.
- `static/css/styles.css`: visual design and responsive layout.
- `static/js/app.js`: sends chat messages, displays replies, detects offline state, and registers the service worker.
- `manifest.webmanifest` route: tells the browser the app name, colors, icon, and install display mode.
- `service-worker.js` route: caches the app shell for basic offline opening.
- `.env`: stores the secret API key on your computer; do not share it.

## Troubleshooting
- **`python` is not recognized:** reinstall Python and enable “Add Python to PATH”, then reopen Command Prompt.
- **`No module named django` or `google`:** activate `.venv` and run `pip install -r requirements.txt` again.
- **API key is not set:** check that the file is named `.env`, is in the same folder as `manage.py`, and contains `GEMINI_API_KEY=your_key`.
- **AI request failed:** check internet access, that the key is valid, that Gemini API access is enabled for the key, and that the model name is available to your account. The terminal prints more details.
- **CSRF or server error:** stop the server with `Ctrl+C`, then restart with `python manage.py runserver`.
- **Changes do not appear:** hard refresh with `Ctrl+F5`. For service-worker changes, clear site data in browser DevTools and reload.

## Before submitting
1. Replace the example API key with your own private key in `.env`.
2. Take screenshots of the home page, a sample AI response, and the offline notice.
3. Be ready to explain that the browser sends the question to Django; Django calls Gemini using the secret key; Django sends the response back to the browser.
