const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads (store in memory, max 25MB total)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 10 // max 10 files
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Configure Gmail SMTP transporter
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.RECIPIENT_EMAIL);
  res.json({
    status: 'ok',
    configured,
    recipient: configured ? process.env.RECIPIENT_EMAIL : null
  });
});

// Send email with attachments
app.post('/api/send', upload.array('files', 10), async (req, res) => {
  try {
    const { subject } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files attached' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ error: 'Email not configured. Check server .env file.' });
    }

    // Prepare attachments
    const attachments = files.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    // Build email
    const senderName = process.env.SENDER_NAME || 'MailDrop';
    const mailOptions = {
      from: `"${senderName}" <${process.env.GMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: subject || 'Files from MailDrop',
      text: `${files.length} file(s) forwarded via MailDrop.\n\nFiles:\n${files.map(f => `  • ${f.originalname} (${formatSize(f.size)})`).join('\n')}`,
      html: buildEmailHTML(files, subject),
      attachments
    };

    // Send
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: info.messageId,
      filesCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });

  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({
      error: error.message || 'Failed to send email'
    });
  }
});

// Build a clean HTML email body
function buildEmailHTML(files, subject) {
  const fileRows = files.map(f => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${getFileIcon(f.originalname)} ${f.originalname}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #888;">${formatSize(f.size)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">📧 MailDrop</h2>
        ${subject ? `<p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Ref: ${subject}</p>` : ''}
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #334155; margin: 0 0 12px; font-size: 14px;">${files.length} file(s) attached:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${fileRows}
        </table>
        <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0;">Sent via MailDrop</p>
      </div>
    </div>
  `;
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  return '📄';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Start server
app.listen(PORT, () => {
  console.log(`\n  📧 MailDrop is running!`);
  console.log(`  🌐 http://localhost:${PORT}\n`);
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('  ⚠️  Email not configured! Copy .env.example to .env and add your credentials.\n');
  }
});
