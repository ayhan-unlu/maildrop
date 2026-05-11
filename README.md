# 📧 MailDrop

**Forward WhatsApp files to your email inbox — instantly.**

A simple mobile web app for forwarding files received on WhatsApp to your email. Installable on Android as a home screen app.

---

## Quick Setup (5 minutes)

### Step 1: Get a Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Make sure **2-Step Verification** is turned ON
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select **"Mail"** and click **Generate**
5. Copy the 16-character password (e.g. `abcd efgh ijkl mnop`)

### Step 2: Configure the App

```bash
# Copy the example config
cp .env.example .env
```

Edit `.env` and fill in your values:
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
RECIPIENT_EMAIL=your-email@gmail.com
SENDER_NAME=MailDrop
PORT=3000
```

### Step 3: Install & Run

```bash
npm install
npm start
```

The app will be running at `http://localhost:3000`

### Step 4: Install on Android

1. Open the URL on your Android phone's Chrome browser
2. Tap the **⋮ menu** → **"Add to Home screen"**
3. Now you have a MailDrop icon on your home screen! 📱

---

## How to Use

1. **Download** files from WhatsApp to your phone
2. **Open MailDrop** from your home screen
3. **Tap "Pick Files"** — select the files
4. **Add a reference number** (optional)
5. **Tap Send** — files arrive in your Gmail inbox ✅

---

## Deploy Online (Free)

To access from anywhere, deploy to [Render.com](https://render.com):

1. Push this project to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Web Service**
4. Connect your GitHub repo
5. Set **Build Command**: `npm install`
6. Set **Start Command**: `npm start`
7. Add your `.env` variables in the **Environment** tab
8. Deploy! You'll get a free `https://your-app.onrender.com` URL

---

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (PWA)
- **Backend**: Node.js, Express
- **Email**: Nodemailer (Gmail SMTP)
- **File Upload**: Multer
