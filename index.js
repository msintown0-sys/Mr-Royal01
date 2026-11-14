import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import P from 'pino';
import qrcode from 'qrcode-terminal';

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' })
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'open') {
      console.log('👑 MR ROYAL BOT CONNECTED!');
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error).output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        startBot();
      } else {
        console.log('WhatsApp logged out. Re-link your account.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;

      if (!jid || jid === 'status@broadcast') continue;

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

⚡ *GENERAL COMMANDS*

.alive - Check bot status
.menu - Show commands
.owner - Bot owner

━━━━━━━━━━━━━━
👑 POWERED BY MR ROYAL`
        });
      }

      else if (command === '.alive') {
        await sock.sendMessage(jid, {
          text: '👑 MR ROYAL BOT IS ONLINE AND ACTIVE!'
        });
      }

      else if (command === '.owner') {
        await sock.sendMessage(jid, {
          text: '👑 Bot Owner: MR ROYAL'
        });
      }
    }
  });
}

startBot().catch(console.error);
