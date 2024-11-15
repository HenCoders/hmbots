const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');  // Untuk mengenerate QR Code

// Tentukan folder untuk menyimpan sesi login otomatis di Render
const sessionFolderPath = path.join(process.env.HOME || '/tmp', 'whatsapp-sessions');

// Pastikan folder sesi ada
if (!fs.existsSync(sessionFolderPath)) {
    fs.mkdirSync(sessionFolderPath, { recursive: true }); // Membuat folder jika belum ada
}

let botStatus = "QR Code untuk login"; // Status ketika menunggu login
let qrCodeUrl = ''; // Menyimpan URL QR code yang aktif
let lastMessages = []; // Menyimpan pesan terakhir untuk ditampilkan di web

// Daftar nomor yang diperbolehkan mengakses bot (Admin dan Pengguna Terverifikasi)
const allowedNumbers = [
    '+6283148450932',  // Admin
    '+6283149073293'   // Nomor yang Diperbolehkan
];

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client", // ID unik untuk sesi
        dataPath: sessionFolderPath // Tentukan folder untuk menyimpan sesi
    })
});

// Event: QR code untuk login
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR code:', err);
            return;
        }
        qrCodeUrl = url;  // Menyimpan URL QR code
        botStatus = "Scan QR code untuk login"; // Status saat menunggu scan
    });
});

// Event: Bot siap (terhubung)
client.on('ready', () => {
    console.log('WhatsApp bot siap digunakan!');
    botStatus = "Bot Sudah Terhubung"; // Status ketika bot siap
});

// Event: Menerima pesan
client.on('message', async (message) => {
    const senderNumber = message.from;  // Mendapatkan nomor pengirim
    const messageText = message.body;   // Mendapatkan isi pesan

    // Simpan pesan terakhir yang diterima
    lastMessages.push({ sender: senderNumber, text: messageText });

    // Hanya simpan 5 pesan terakhir untuk ditampilkan di website
    if (lastMessages.length > 5) {
        lastMessages.shift();  // Menghapus pesan paling lama jika lebih dari 5 pesan
    }

    // Jika pengirim nomor tidak terdaftar, balas dengan pesan penolakan
    if (!allowedNumbers.includes(senderNumber)) {
        client.sendMessage(message.from, 'Maaf, Anda tidak terdaftar untuk menggunakan bot ini.');
        return;
    }

    // Jika pengirim nomor terdaftar, kirim pesan dengan gambar dan link
    if (allowedNumbers.includes(senderNumber)) {
        // Path gambar (letakkan gambar di folder yang sama dengan index.js)
        const imagePath = path.join(__dirname, 'kamu.jpg'); // Gambar di folder yang sama dengan index.js

        // Mengirim gambar pertama
        client.sendMessage(message.from, 'Hallo Juga, Reisya, Nih Pembuat Saya Menitipkan Sesuatu Ke Saya, Silakan Klik Link Di Bawah Ini.');

        // Kirim gambar media
        const media = await client.sendMessage(message.from, fs.readFileSync(imagePath), { caption: 'Pesan Special Untuk Reisya' });

        // Mengirim pesan dengan link langsung
        const linkMessage = `Silakan klik link berikut untuk mengunjungi website saya: https://reisya.ct.ws`;
        client.sendMessage(message.from, linkMessage);
    }
});

// Event: Bot logout atau session expired
client.on('disconnected', () => {
    console.log('Bot terputus atau sesi kedaluwarsa.');
    botStatus = "QR Code untuk login"; // Tampilkan QR kembali jika bot logout
    qrCodeUrl = ''; // Kosongkan URL QR untuk mengharuskan sesi baru
});

// Menjalankan server web untuk menampilkan QR Code atau Status Bot
const app = express();

app.get('/', (req, res) => {
    // Menampilkan halaman dengan QR atau status bot
    res.send(`
        <html>
            <head><title>WhatsApp Bot QR Code</title></head>
            <body>
                <h1>WhatsApp Bot</h1>
                <p>${botStatus}</p>
                ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR Code" />` : ''} <!-- Menampilkan QR code sebagai gambar jika diperlukan -->
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

// Menjalankan bot
client.initialize();
