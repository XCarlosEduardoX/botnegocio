const { OWNER_NUMBERS, BUSSINESS_NUMBER } = require('../config');
const { cargarComandos } = require('../services/botService');
const comandos = cargarComandos();
const productosDB = require('../firebase/productos');
const { crearLinkDePago } = require('../stripe/stripe');
const { db } = require('../firebase/firebase');
const { getHorarios } = require('../utils/getHorarios');
const moment = require('moment');
// Estados en memoria para clientes
const estados = {}; // { '521234567890': 'esperando_producto' | 'esperando_confirmacion' }
const carritos = {}; // { '521234567890': [{ nombre, cantidad, precio }] }
const mensajesPineados = {}; // { '521234567890': messageId }


async function manejarMensaje(message, chatId, send, client) {
  try {
    const texto = message.body.trim();
    const numero = chatId.replace('@c.us', '');
    if (estados[numero] === 'esperando_metodo_pago') {
      return manejarMetodoPago(texto, numero, send);
    }

    if (estados[numero] === 'esperando_confirmacion_pago') {
      return manejarConfirmacionPago(texto, numero, send); // Nueva función específica
    }
    const esAdmin = OWNER_NUMBERS.includes(numero);
    console.log('Número:', numero, 'Texto:', texto, 'Es admin:', esAdmin);


    if (!esAdmin) {
      const { apertura, cierre, dias } = await getHorarios();
      const [horaApertura] = apertura.split(':').map(Number);
      const [horaCierre] = cierre.split(':').map(Number);
      const horaActual = new Date().getHours();

      // Obtener el día actual
      const diasSemana = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      const diaActual = diasSemana[new Date().getDay()];

      // Verificar si es un día laborable
      if (!dias.includes(diaActual)) {
        const diasFormateados = dias.join(',');
        const apertura12h = moment(apertura, 'HH:mm').format('hh:mm A');
        const cierre12h = moment(cierre, 'HH:mm').format('hh:mm A');

        return client.sendMessage(
          message.from,
          `⏰ No hay atención hoy.\nHorario: ${apertura12h} - ${cierre12h}\nDías: ${diasFormateados}`
        );
      }

      // Verificar si está dentro del horario
      if (horaActual < horaApertura || horaActual > horaCierre) {
        const apertura12h = moment(apertura, 'HH:mm').format('hh:mm A');
        const cierre12h = moment(cierre, 'HH:mm').format('hh:mm A');
        const diasFormateados = dias.join(',');

        return client.sendMessage(
          message.from,
          `⏰ Fuera de horario.\nHorario de atención: ${apertura12h} - ${cierre12h}\nDías: ${diasFormateados}`
        );
      }
    }


    const [comandoRaw, ...argsRaw] = texto.split('|');
    const comandoNombre = comandoRaw.trim().toLowerCase();
    const args = argsRaw.join('|').trim();

    if (comandos[comandoNombre]) {
      if (comandos[comandoNombre].adminOnly && !esAdmin) {
        return send('🚫 No tienes permiso para usar este comando.');
      }
      return await comandos[comandoNombre].execute({ args, send });
    }

    if (!esAdmin) {
      return manejarCliente(message, numero, send, client);
    }

    send('❌ Comando no reconocido.');
  } catch (error) {
    console.error('Error en manejarMensaje:', error);
    send('⚠️ Ocurrió un error al procesar tu mensaje.');
  }
}

async function manejarCliente(message, chatId, send, client) {
  const numero = chatId.replace('@c.us', '');
  const texto = message.body.trim().toLowerCase();

  // Verificar si el cliente está en medio de un proceso
  if (estados[numero]) {
    switch (estados[numero]) {
      case 'esperando_producto':
        return await manejarSeleccionProducto(texto, numero, send, client);
      case 'esperando_confirmacion':
        return await manejarConfirmacionCompra(texto, numero, send);
    }
  }

  // Si no hay estado activo, iniciar nuevo flujo
  await iniciarFlujoCompra(numero, send);
}
// ========== ENVIAR LISTA DE PRODUCTOS ==========
async function enviarListaDeProductos(numero, send) {
  const productos = await productosDB.obtenerProductos();
  if (!productos.length) {
    return send('⚠️ Aún no hay productos disponibles.');
  }

  let mensaje = '📋 Aquí están los productos disponibles:\n\n';
  productos.forEach((p, i) => {
    mensaje += `${i + 1}. ${p.nombre} - $${p.precio}\n`;
  });

  return send(mensaje);
}



async function manejarSeleccionProducto(texto, numero, send, client) {
  const productos = await productosDB.obtenerProductos();
  const textoLimpio = texto.trim().toLowerCase();

  // 1. Separar nombre y cantidad (obligatorio espacio/guion/)
  const partes = textoLimpio.split(/[\s\-]+/); // Admite "camisa negra 2" o "camisa-negra-2"
  let nombreInput, cantidad;

  // Extraer cantidad (último número en el mensaje)
  const ultimoElemento = partes[partes.length - 1];
  if (!isNaN(parseInt(ultimoElemento))) {
    cantidad = parseInt(ultimoElemento);
    nombreInput = partes.slice(0, -1).join(' '); // Une el resto como nombre
  } else {
    cantidad = 1; // Valor por defecto
    nombreInput = partes.join(' ');
  }

  // 2. Buscar producto (insensible a mayúsculas/espacios)
  const producto = productos.find(p =>
    p.nombre.toLowerCase().replace(/\s+/g, ' ') === nombreInput
  );

  if (!producto) {
    // Dividir y extraer posible cantidad
    const partes = textoLimpio.split(' ');
    const posibleCantidad = parseInt(partes[partes.length - 1]);

    if (!isNaN(posibleCantidad)) {
      cantidad = posibleCantidad;
      partes.pop(); // remover cantidad del texto
    }

    const input = partes.join(' ').trim();

    // Buscar por nombre
    producto = productos.find(p => p.nombre.toLowerCase() === input);

    // Si sigue sin encontrarse, buscar por ID numérico
    if (!producto && !isNaN(parseInt(input))) {
      const index = parseInt(input) - 1;
      if (productos[index]) {
        producto = productos[index];
      }
    }
  }

  if (!producto) {
    return send(`⚠️ No encontré el producto "${textoLimpio}". Intenta escribirlo tal como aparece en la lista.`);
  }

  if (typeof producto.stock === 'number' && producto.stock < cantidad) {
    return send(`⚠️ Solo quedan ${producto.stock} unidades de "${producto.nombre}".`);
  }

  // AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL: AGREGAR AL CARRITO
  if (!carritos[numero]) {
    carritos[numero] = [];
  }

  carritos[numero].push({
    nombre: producto.nombre,
    cantidad: cantidad,
    precio: producto.precio
  });




  // Quitar pin del mensaje anterior
  if (mensajesPineados[numero]) {
    console.log('Mensaje pineado:', mensajesPineados[numero]);
    try {
      const mensajeAnterior = await client.getMessageById(mensajesPineados[numero]);
      if (mensajeAnterior) {
        await mensajeAnterior.unpin();
      } else {
        console.warn('Mensaje anterior no encontrado');
      }
    } catch (error) {
      console.error('Error al quitar pin del mensaje anterior:', error);
    }
  }


  // Crear resumen del carrito
  let resumenCarrito = '🛒 *Carrito actual:*\n\n';
  carritos[numero].forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    resumenCarrito += `${index + 1}. ${item.nombre} x${item.cantidad} = $${subtotal}\n`;
  });
  resumenCarrito += `\n💵 *Total: $${carritos[numero].reduce((acc, item) => acc + (item.precio * item.cantidad), 0)}*`;

  // Enviar y pinear nuevo mensaje
  const nuevoMensaje = await send(`${resumenCarrito}`);

  try {
    await nuevoMensaje.pin();
    mensajesPineados[numero] = nuevoMensaje.id._serialized || nuevoMensaje.id;
  } catch (error) {
    console.error('Error al pinear el mensaje:', error);
  }



  estados[numero] = 'esperando_confirmacion';
  return send('✅ Producto agregado al carrito. ¿Quieres terminar o agregar más?\nEscribe *agregar* o *terminar*');
}




// ========== MANEJAR CONFIRMACIÓN ==========
async function manejarConfirmacionCompra(texto, numero, send) {
  const estadoActual = estados[numero];
  const mensaje = texto.toLowerCase();

  if (estadoActual === 'esperando_confirmacion') {
    if (mensaje.includes('agregar')) {
      estados[numero] = 'esperando_producto';
      await enviarListaDeProductos(numero, send);
      return await send('✍️ Escribe el nombre o ID del siguiente producto y la cantidad:');
    }
    else if (mensaje.includes('terminar')) {
      if (!carritos[numero]?.length) {
        return await send('🛒 Tu carrito está vacío. ¿Quieres comenzar de nuevo?');
      }

      // Generar resumen
      let resumen = '🧾 *Resumen de tu pedido:*\n\n';
      let total = 0;

      carritos[numero].forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        resumen += `${index + 1}. ${item.nombre} x${item.cantidad} = $${subtotal}\n`;
      });

      resumen += `\n💵 *Total: $${total}*\n\n`;
      resumen += '💳 *Selecciona tu método de pago:*\n\n';
      resumen += '1. 💵 Efectivo\n';
      resumen += '2. 📤 Transferencia\n';
      resumen += '3. 💳 Tarjeta/Oxxo\n\n';
      resumen += 'Escribe el número o nombre del método:';

      estados[numero] = 'esperando_metodo_pago'; // Cambiar estado directamente aquí
      return await send(resumen);
    }
    else {
      return await send('❌ Opción no válida. Por favor escribe *agregar* o *terminar*.');
    }
  }
}

async function manejarMetodoPago(texto, numero, send) {
  const metodo = texto.trim().toLowerCase();

  if (metodo.includes('efectivo') || metodo === '1') {
    // Guardar pedido en Firebase como "pendiente de pago"
    const pedidosDB = require('../firebase/pedidos');
    await pedidosDB.guardarPedidoEnDB(numero, carritos[numero], 'efectivo');

    await send(
      '💰 *Pago en efectivo registrado*\n\n' +
      'Por favor paga al recibir tu pedido.\n\n' +
      '📦 *Tu pedido:*\n' +
      generarResumenCarrito(carritos[numero]) +
      '\n\n¿Necesitas algo más?'
    );

    // Limpiar todo
    carritos[numero] = [];
    estados[numero] = null;

  }
  else if (metodo.includes('transferencia') || metodo === '2') {
    // Guardar pedido en Firebase como "pendiente de pago"
    const pedidosDB = require('../firebase/pedidos');
    await pedidosDB.guardarPedidoEnDB(numero, carritos[numero], 'transferencia');

    await send(
      '📤 *Datos para transferencia:*\n\n' +
      '• Banco: BBVA\n' +
      '• CLABE: 0123 4567 8910\n' +
      '• Envía comprobante aquí\n\n' +
      '📦 *Tu pedido:*\n' +
      generarResumenCarrito(carritos[numero])
    );

    // Limpiar todo
    carritos[numero] = [];
    estados[numero] = null;

  }
  else if (metodo.includes('tarjeta') || metodo.includes('oxxo') || metodo === '3') {
    try {
      const pedidosDB = require('../firebase/pedidos');
      const docRef = await pedidosDB.guardarPedidoEnDB(numero, carritos[numero], 'tarjeta');

      const linkPago = await crearLinkDePago(carritos[numero], docRef.id, numero);

      await send(
        '🔗 *Link de pago (Stripe):*\n' +
        linkPago + '\n\n' +
        '⚠️ Válido por 24 horas\n' +
        'Para Oxxo: Selecciona "Pago en efectivo" en el checkout'
      );

      // Limpiar todo
      carritos[numero] = [];
      estados[numero] = null;

    } catch (error) {
      console.error(error);
      await send('❌ Error al generar el pago. Intenta nuevamente.');
    }
  }
  else {
    await send(
      '❌ *Método no válido*\n\n' +
      'Escribe:\n' +
      '1. 💵 Efectivo\n' +
      '2. 📤 Transferencia\n' +
      '3. 💳 Tarjeta/Oxxo'
    );
  }
}



async function manejarConfirmacionPago(texto, numero, send) {
  if (estados[numero] === 'esperando_metodo_pago') {
    return procesarMetodoPago(texto, numero, send); // Nueva función dedicada
  }

  if (texto.includes('pagar')) {
    try {
      // Paso 1: Preguntar método de pago (solo si no está ya en este estado)
      if (estados[numero] !== 'esperando_metodo_pago') {
        estados[numero] = 'esperando_metodo_pago';
        return await send(
          '💳 *Selecciona tu método de pago:*\n\n' +
          '1. 💵 Efectivo\n' +
          '2. 📤 Transferencia\n' +
          '3. 💳 Tarjeta/Oxxo (Pago en línea)\n\n' +
          'Escribe el número o nombre del método:'
        );
      }

      // Paso 2: Procesar la selección del método
      const metodo = texto.trim().toLowerCase();

      if (metodo.includes('efectivo') || metodo === '1') {
        carritos[numero] = [];
        estados[numero] = null;
        return await send(
          '💰 *Pago en efectivo seleccionado*\n\n' +
          'Por favor entrega el monto exacto al recibir tu pedido.\n\n' +
          '¿Necesitas ayuda con algo más?'
        );

      } else if (metodo.includes('transferencia') || metodo === '2') {
        carritos[numero] = [];
        estados[numero] = null;
        return await send(
          '📤 *Pago por transferencia*\n\n' +
          'Banco: BBVA\n' +
          'CLABE: 0123 4567 8910 1112\n' +
          'Titular: Tu Negocio\n\n' +
          '⚠️ Envía el comprobante por este chat para validar tu pago.'
        );

      } else if (metodo.includes('tarjeta') || metodo.includes('oxxo') || metodo === '3') {
        // Guardar pedido en Firebase y generar link de pago
        const pedidosDB = require('../firebase/pedidos');
        const docRef = await pedidosDB.guardarPedidoEnDB(numero, carritos[numero]);

        const linkPago = await crearLinkDePago(carritos[numero], docRef.id, numero);

        await send(
          '🔗 *Link de pago generado (Tarjeta/Oxxo):*\n' +
          `${linkPago}\n\n` +
          '⚠️ *Instrucciones:*\n' +
          '• Válido por 24 horas\n' +
          '• Aceptamos todas las tarjetas\n' +
          '• Para pagar en Oxxo: selecciona "Pago en efectivo" en el checkout'
        );

        // Limpiar carrito y estado
        carritos[numero] = [];
        estados[numero] = null;

      } else {
        return await send(
          '❌ Método no reconocido. Por favor elige:\n\n' +
          '1. Efectivo\n' +
          '2. Transferencia\n' +
          '3. Tarjeta/Oxxo'
        );
      }

    } catch (error) {
      console.error('Error en proceso de pago:', error);
      await send('❌ Ocurrió un error. Por favor intenta nuevamente.');
    }
  }
  else if (texto.includes('cancelar')) {
    carritos[numero] = [];
    estados[numero] = null;
    await send('❌ Pedido cancelado. ¿Quieres comenzar de nuevo?');
  }
  else {
    await send('❌ Opción no válida. Escribe *"pagar"* o *"cancelar"*:');
  }
}

async function procesarMetodoPago(texto, numero, send) {
  const metodo = texto.trim().toLowerCase();

  if (metodo.includes('efectivo') || metodo === '1') {
    estados[numero] = null; // ¡Importante! Resetear estado
    await send(
      '💰 *Pago en efectivo registrado*\n\n' +
      'Por favor paga al recibir tu pedido.\n\n' +
      '📦 *Tu pedido:*\n' +
      generarResumenCarrito(carritos[numero]) +
      '\n\n¿Necesitas algo más?'
    );
    carritos[numero] = []; // Limpiar carrito

  } else if (metodo.includes('transferencia') || metodo === '2') {
    estados[numero] = null;
    await send(
      '📤 *Datos para transferencia:*\n\n' +
      '• Banco: BBVA\n' +
      '• CLABE: 0123 4567 8910\n' +
      '• Envía comprobante aquí\n\n' +
      '📦 *Tu pedido:*\n' +
      generarResumenCarrito(carritos[numero])
    );
    carritos[numero] = [];

  } else if (metodo.includes('tarjeta') || metodo.includes('oxxo') || metodo === '3') {
    try {
      const pedidosDB = require('../firebase/pedidos');
      const docRef = await pedidosDB.guardarPedidoEnDB(numero, carritos[numero]);

      const linkPago = await crearLinkDePago(carritos[numero], docRef.id, numero);

      await send(
        '🔗 *Link de pago (Stripe):*\n' +
        linkPago + '\n\n' +
        '⚠️ Válido por 24 horas'
      );

      carritos[numero] = [];
      estados[numero] = null;

    } catch (error) {
      console.error(error);
      await send('❌ Error al generar el pago. Intenta nuevamente.');
    }

  } else {
    // Si la opción no es válida, mantener el estado y pedir de nuevo
    await send(
      '❌ *Método no válido*\n\n' +
      'Escribe:\n' +
      '1. 💵 Efectivo\n' +
      '2. 📤 Transferencia\n' +
      '3. 💳 Tarjeta/Oxxo'
    );
  }
}

// Función auxiliar para el resumen
function generarResumenCarrito(carrito) {
  return carrito.map(item =>
    `• ${item.nombre} x${item.cantidad} = $${item.precio * item.cantidad}`
  ).join('\n');
}

async function iniciarFlujoCompra(numero, send) {
  const clienteNuevo = await verificarSiEsNuevoCliente(numero);

  // Inicializar carrito ANTES de cualquier operación
  carritos[numero] = [];

  await enviarListaDeProductos(numero, send);

  if (clienteNuevo) {
    await send(`👋 ¡Hola! Bienvenido a [nombre del negocio].\n🛒 Estoy aquí para ayudarte...`);
  } else {
    await send('¡Hola de nuevo! 😊 ¿Qué deseas comprar hoy?');
  }

  estados[numero] = 'esperando_producto';
}

// ========== VERIFICAR CLIENTE ==========
async function verificarSiEsNuevoCliente(numero) {
  const clientesRef = db.collection('clientes');
  const clienteSnap = await clientesRef.doc(numero).get();
  return !clienteSnap.exists;
}



module.exports = { manejarMensaje };
