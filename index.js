const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

// Tentukan folder untuk menyimpan sesi login otomatis di Render
let botStatus = "QR Code untuk login";
let qrCodeUrl = '';
let lastMessages = [];

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client",
    }),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

// Event: QR code untuk login
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR code:', err);
            return;
        }
        qrCodeUrl = url;
        botStatus = "Scan QR code untuk login";
    });
});

// Event: Bot siap (terhubung)
client.on('ready', () => {
    console.log('WhatsApp bot siap digunakan!');
    botStatus = "Bot Sudah Terhubung";

    // Memastikan bot tetap aktif dengan mengirimkan ping setiap beberapa menit
    setInterval(() => {
        client.sendPresenceAvailable();
        console.log('Status WhatsApp: Online');
    }, 60000); // Kirim "Online" setiap 1 menit
});

// Event: Menerima pesan
client.on('message', async (message) => {
    const senderNumber = message.from;
    const messageText = message.body;

    lastMessages.push({ sender: senderNumber, text: messageText });

    if (lastMessages.length > 5) {
        lastMessages.shift();
    }

    client.sendMessage(message.from, 'Hallo Juga Reisya, Pembuat Saya Menitipkan Sesuatu, Silakan Klik Link Di Bawah Ini.');

    const imageUrl = 'https://raw.githubusercontent.com/HenCoders/hmbots/refs/heads/main/kamu.jpg'; // Ganti dengan link gambar kamu
    const media = await MessageMedia.fromUrl(imageUrl);
    client.sendMessage(message.from, media, { caption: 'Pesan Special Untuk Reisya' });

    const linkMessage = `Silakan klik link berikut untuk mengunjungi website saya: https://reisya.ct.ws`;
    client.sendMessage(message.from, linkMessage);
});

// Event: Bot logout atau session expired
client.on('disconnected', () => {
    console.log('Bot terputus atau sesi kedaluwarsa.');
    botStatus = "QR Code untuk login";
    qrCodeUrl = '';
});

// Menjalankan server web untuk menampilkan QR Code atau Status Bot
const app = express();

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>WhatsApp Bot QR Code</title></head>
            <body>
                <h1>WhatsApp Bot</h1>
                <p>${botStatus}</p>
                ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR Code" />` : ''}
                <h2>Pesan Terakhir</h2>
                ${lastMessages.length > 0 ? lastMessages.map(msg => 
                    `<p><strong>${msg.sender}:</strong> ${msg.text}</p>`
                ).join('') : '<p>Belum ada pesan.</p>'}
            </body>
        </html>
    `);
});

app.listen(3000, () => {
    console.log('Server berjalan di http://localhost:3000');
});

client.initialize();
