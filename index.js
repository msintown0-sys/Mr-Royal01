import { createServer } from 'node:http';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

import P from 'pino';
import qrcode from 'qrcode-terminal';
createServer((req, res) => {
  res.writeHead(200);
  res.end('MR ROYAL BOT IS RUNNING');
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
