const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { manejarMensaje } = require('./conversacionHandler');

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Bot listo ✅'));



client.on('message', async (message) => {
  if (message.fromMe) return;
  // saber si es un grupo o un chat privado
  const isGroup = message.from.includes('@g.us');
  if (isGroup) return;
  await manejarMensaje(message, message.from, (msg) => client.sendMessage(message.from, msg));
});

client.initialize();
