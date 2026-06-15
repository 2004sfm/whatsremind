const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let sock;
let qrCodeData = null;
let isConnected = false;
let userPhone = null;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState(process.env.AUTH_DIR || 'auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["WhatsRemind", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = qr;
            console.log("QR Code received.");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            isConnected = false;
            qrCodeData = null;
            userPhone = null;
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                startSock();
            } else {
                console.log('Logged out from WhatsApp. Deleting auth_info_baileys...');
                fs.rmSync(process.env.AUTH_DIR || 'auth_info_baileys', { recursive: true, force: true });
                startSock();
            }
        } else if (connection === 'open') {
            isConnected = true;
            qrCodeData = null;
            userPhone = sock?.user?.id?.split(':')[0] || null;
            console.log('opened connection');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        // We only care about outbound for now, but we can log inbound here.
    });
}

startSock();

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        qr: qrCodeData,
        phone: userPhone
    });
});

app.post('/send', async (req, res) => {
    if (!isConnected) {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    
    const { phone, text, type } = req.body;
    if (!phone || !text) {
        return res.status(400).json({ error: 'Missing phone or text' });
    }

    try {
        let jid = phone;
        if (!jid.includes('@s.whatsapp.net')) {
            jid = jid.replace(/\D/g, '') + '@s.whatsapp.net';
        }
        
        // Verify if the number exists on WhatsApp and resolve the true JID
        const waStatus = await sock.onWhatsApp(jid);
        if (!waStatus || waStatus.length === 0 || !waStatus[0].exists) {
            return res.status(404).json({ error: 'El número no está registrado en WhatsApp' });
        }
        
        const trueJid = waStatus[0].jid;
        console.log(`Sending to ${trueJid}: "${text.substring(0, 50)}..."`);
        await sock.sendMessage(trueJid, { text });
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to send message:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/logout', async (req, res) => {
    if (!sock) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    try {
        await sock.logout();
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to logout:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Baileys sidecar listening on port ${PORT}`);
});

process.stdin.resume();
process.stdin.on('end', () => process.exit(0));
