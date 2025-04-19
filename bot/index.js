const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { manejarMensaje } = require('./conversacionHandler');
const { db } = require('../firebase/firebase');
const { BUSSINESS_NUMBER } = require('../config');

const client = new Client({ authStrategy: new LocalAuth() });

// 1. Inicialización del bot
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
  console.log('Bot listo ✅');
  iniciarProcesadorDeCola(); // <- Inicia el procesamiento de mensajes pendientes
});

// 2. Manejo de mensajes entrantes
client.on('message', async (message) => {
  if (message.fromMe) return;
  const isGroup = message.from.includes('@g.us');
  if (isGroup) return;
  await manejarMensaje(message, message.from, (msg) => client.sendMessage(message.from, msg), client);
});

// 3. Procesar mensajes pendientes desde Firebase
async function procesarMensajesPendientes() {
  try {
    const mensajesSnapshot = await db.collection('negocios').doc(BUSSINESS_NUMBER).collection('mensajes_pendientes')
      .where('status', '==', 'pendiente')
      .limit(10) // Procesa 10 mensajes por ciclo
      .get();

    if (mensajesSnapshot.empty) {
      console.log('No hay mensajes pendientes.');
      return;
    }

    mensajesSnapshot.forEach(async (doc) => {
      const mensaje = doc.data();
      try {
        await client.sendMessage(mensaje.numero, mensaje.mensaje);
        await doc.ref.update({
          status: 'enviado',
          enviadoEl: new Date().toISOString(),
        });
        console.log(`✅ Mensaje enviado a ${mensaje.numero}`);
      } catch (error) {
        console.error(`❌ Error al enviar a ${mensaje.numero}:`, error.message);
        await manejarErrorEnvio(doc.ref, error);
      }
    });
  } catch (error) {
    console.error('Error en procesarMensajesPendientes:', error);
  }
}

// 4. Manejo de errores (reintentos automáticos)
async function manejarErrorEnvio(docRef, error) {
  const doc = await docRef.get();
  const intentosActuales = doc.data().intentos || 0;

  if (intentosActuales >= 3) {
    await docRef.update({
      status: 'fallido',
      error: error.message
    });
  } else {
    await docRef.update({
      intentos: intentosActuales + 1,
      ultimoError: error.message
    });
  }
}

// 5. Iniciar el procesamiento periódico
function iniciarProcesadorDeCola() {
  setInterval(procesarMensajesPendientes, 30000); // Cada 30 segundos
  console.log('🔄 Procesador de cola iniciado');
}

client.initialize();