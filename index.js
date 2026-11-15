import { createServer } from 'node:http';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

import P from 'pino';
import QRCode from 'qrcode';
let latestQR = '';

createServer((req, res) => {
    if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="refresh" content="3">
            </head>
            <body style="background:#111;color:white;text-align:center;font-family:Arial;padding:20px">
                <h2>MR ROYAL BOT</h2>
                ${latestQR ? `<img src="${latestQR}" style="width:90%;max-width:350px;background:white;padding:10px">` : '<h3>Waiting for QR code...</h3>'}
            </body>
            </html>
        `);
    } else {
        res.writeHead(200);
        res.end('MR ROYAL BOT IS RUNNING. Open /qr to pair WhatsApp.');
    }
}).listen(process.env.PORT || 3000, '0.0.0.0');
async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('SCAN THIS QR CODE:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('👑 MR ROYAL BOT IS CONNECTED!');
    }

    if (connection === 'close') {
      const loggedOut =
        lastDisconnect?.error?.output?.statusCode ===
        DisconnectReason.loggedOut;

      if (!loggedOut) {
        setTimeout(() => startBot(), 5000);
      } else {
        console.log('WhatsApp logged out.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const jid = msg.key.remoteJid;

      const botNumber = sock.user?.id
        ?.split(':')[0]
        .split('@')[0];

      const chatNumber = jid?.split('@')[0];

      // Only accept commands from the owner's self-chat.
      if (!msg.key.fromMe) continue;
      if (jid?.endsWith('@g.us')) continue;
      if (chatNumber !== botNumber) continue;

      const text = (
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ''
      ).trim();

      const command = text.toLowerCase();

      if (command === '.menu') {
        await sock.sendMessage(jid, {
          text: `👑 *MR ROYAL BOT*

━━━━━━━━━━━━━━

⚡ GENERAL COMMANDS

.alive - Bot status
.menu - Command menu
.owner - Bot owner

━━━━━━━━━━━━━━

🔐 OWNER CONTROL ONLY

👑 POWERED BY MR ROYAL`
        });
      }

      else if (command === '.alive') {
        await sock.sendMessage(jid, {
          text: '👑 MR ROYAL BOT IS ONLINE!'
        });
      }

          else if (command === '.owner') {
      await sock.sendMessage(jid, {
        text: '👑 OWNER: MR ROYAL'
      });
    }
  }
});
}

startBot().catch(console.error);
