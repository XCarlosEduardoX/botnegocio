const { OWNER_NUMBERS, BUSSINESS_NUMBER } = require('../config');
const { cargarComandos } = require('../services/botService');
const comandos = cargarComandos();

async function manejarMensaje(message, chatId, send) {
  const texto = message.body.trim();
  const numero = chatId.replace('@c.us', '');
  const esAdmin = OWNER_NUMBERS.includes(numero);

  const [comandoRaw, ...argsRaw] = texto.split('|');
  const comandoNombre = comandoRaw.trim().toLowerCase();
  const args = argsRaw.join('|').trim();

  const comando = comandos[comandoNombre];

  if (comando) {
    if (comando.adminOnly && !esAdmin) {
      return send('🚫 No tienes permiso para usar este comando.');
    }

    return await comando.execute({ args, send });
  }

  // Si no es comando, sigue con el flujo cliente
  if (!esAdmin) {
    return manejarCliente(message, numero, send);
  }

  send('❌ Comando no reconocido.');
}

async function manejarCliente(message, chatId, send) {
  // flujo conversacional del cliente
}

module.exports = { manejarMensaje };
