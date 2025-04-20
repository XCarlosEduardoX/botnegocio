const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { manejarMensaje } = require('./conversacionHandler');
const { db } = require('../firebase/firebase');
const { getCierreTemporal } = require('../utils/getCierreTemporal');
const cron = require('node-cron');
global.estados = {};
global.carritos = {};
global.mensajesPineados = {};
const configuracionDB = require('../firebase/configuracion');


const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true } });

// 1. Inicialización del bot

client.on('qr', qr => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`;
  console.log('🔗 Escanea el código QR aquí:');
  console.log(qrUrl);
  let uri = encodeURI(qrUrl);
  open(uri); // abre el navegador automáticamente
}); client.on('ready', async () => {
  console.log('Bot listo ✅');
  try {
    const conversacionesRef = db
      .collection('negocios')
      .doc(process.env.BUSSINESS_NUMBER)
      .collection('conversaciones');

    const snapshot = await conversacionesRef.get();

    snapshot.forEach(doc => {
      const numero = doc.id;
      const data = doc.data();

      // Restaurar estado y carrito en memoria
      if (data.estado) {
        estados[numero] = data.estado;
        carritos[numero] = data.carrito || [];
      }
    });

    console.log('Estados de conversación recuperados ✅');
  } catch (error) {
    console.error('Error al recuperar estados:', error);
  }

  iniciarProcesadorDeCola(); // <- Inicia el procesamiento de mensajes pendientes
});

//cada minuto
cron.schedule('* * * * *', async () => {
  await recordarCierreTemporal();

});

// Limpiar estados antiguos cada 12 horas
cron.schedule('0 */12 * * *', () => {
  limpiarEstadosAntiguos();
});


async function limpiarEstadosAntiguos() {
  const TIEMPO_MAXIMO = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
  const limiteTiempo = new Date(Date.now() - TIEMPO_MAXIMO);

  try {
    const snapshot = await db
      .collection('negocios')
      .doc(process.env.process.env.BUSSINESS_NUMBER)
      .collection('conversaciones')
      .where('ultimaActualizacion', '<', limiteTiempo)
      .get();

    const batch = db.batch();

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!snapshot.empty) {
      await batch.commit();
      console.log(`Se eliminaron ${snapshot.size} conversaciones antiguas.`);
    } else {
      console.log('No hay conversaciones antiguas para eliminar.');
    }
  } catch (error) {
    console.error('Error al limpiar estados antiguos:', error);
  }
}


async function recordarCierreTemporal() {
  const cierreTemporal = await getCierreTemporal();
  if (cierreTemporal) {
    const propietarios = await configuracionDB.obtenerPropietarios();
    const mensaje = `⚠️ ¡Cierre Temporal Activado! ⚠️\n\n No estas aceptando pedidos en estos momentos.`;
    propietarios.forEach(async (number) => {
      let numberOwner = number + '@c.us';
      await client.sendMessage(numberOwner, mensaje);
    });
  }
}




// 2. Manejo de mensajes entrantes
client.on('message', async (message) => {
  if (message.fromMe || message.from.includes('@g.us')) return;

  await manejarMensaje(
    message,
    message.from,
    (msg) => client.sendMessage(message.from, msg),
    client
  );
});

// 3. Procesar mensajes pendientes desde Firebase
async function procesarMensajesPendientes() {
  try {
    const snapshot = await db
      .collection('negocios')
      .doc(process.env.BUSSINESS_NUMBER)
      .collection('mensajes_pendientes')
      .where('status', '==', 'pendiente')
      .limit(10)
      .get();

    if (snapshot.empty) return;

    const procesos = snapshot.docs.map(async (doc) => {
      const { numero, mensaje } = doc.data();
      try {
        await client.sendMessage(numero, mensaje);
        await doc.ref.update({
          status: 'enviado',
          enviadoEl: new Date().toISOString(),
        });
        console.log(`✅ Mensaje enviado a ${numero}`);
      } catch (error) {
        console.error(`❌ Error al enviar a ${numero}: `, error.message);
        await manejarErrorEnvio(doc.ref, error);
      }
    });

    await Promise.all(procesos);
  } catch (error) {
    console.error('❌ Error general en procesarMensajesPendientes:', error);
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