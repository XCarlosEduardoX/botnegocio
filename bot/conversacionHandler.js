const { OWNER_NUMBERS, BUSSINESS_NUMBER } = require('../config');
const { cargarComandos } = require('../services/botService');
const comandos = cargarComandos();
const productosDB = require('../firebase/productos');
const { crearLinkDePago } = require('../stripe/stripe');

const { db } = require('../firebase/firebase');



// Estados en memoria para clientes
const estados = {}; // { '521234567890': 'esperando_producto' | 'esperando_confirmacion' }
const carritos = {}; // { '521234567890': [{ nombre, cantidad, precio }] }
const mensajesPineados = {}; // { '521234567890': messageId }


async function manejarMensaje(message, chatId, send, client) {
  try {
    const texto = message.body.trim();
    const numero = chatId.replace('@c.us', '');
    if (estados[numero] === 'esperando_confirmacion_pago') {
      return manejarConfirmacionPago(texto, numero, send); // Nueva función específica
    }
    const esAdmin = OWNER_NUMBERS.includes(numero);
    console.log('Número:', numero, 'Texto:', texto, 'Es admin:', esAdmin);

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
    } else if (texto.includes('terminar')) {
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
      resumen += 'Escribe *"pagar"* para generar el link de pago 🔗\n';
      resumen += 'O *"cancelar"* para vaciar el carrito ❌';

      // ¡Establece el estado clave aquí!
      estados[numero] = 'esperando_confirmacion_pago';
      return await send(resumen);
    } else {
      return await send('❌ Opción no válida. Por favor escribe *agregar* o *terminar*.');
    }
  }

  // if (estadoActual === 'esperando_confirmacion_pago') {
  //   if (mensaje.includes('pagar')) {
  //     try {
  //       const linkPago = await crearLinkDePago(carritos[numero]);
  //       const pedidosDB = require('../firebase/pedidos');
  //       await pedidosDB.guardarPedidoEnDB(numero, carritos[numero], linkPago);
  //       await send(`🔗 *Link de pago generado:*\n${linkPago}\n\n` +
  //         `⚠️ *Importante:*\n• El link expira en 24 horas.\n• Después de pagar, te enviaremos un comprobante.`);

  //       // Aquí podrías guardar la orden en la DB para validación después
  //       // await guardarPedidoEnDB(numero, carritos[numero], linkPago);

  //       carritos[numero] = [];
  //       estados[numero] = null;
  //     } catch (error) {
  //       console.error('Error al crear link de pago:', error);
  //       return await send('❌ Ocurrió un error al generar el pago. Por favor intenta nuevamente.');
  //     }
  //   } else if (mensaje.includes('cancelar')) {
  //     carritos[numero] = [];
  //     estados[numero] = null;
  //     return await send('❌ Carrito cancelado. ¿Deseas comenzar de nuevo?');
  //   } else {
  //     return await send('❌ Opción no reconocida. Por favor escribe *pagar* o *cancelar*.');
  //   }
  // }

  return await send('❌ Opción no válida. Por favor escribe *agregar* o *terminar*.');
}

async function manejarConfirmacionPago(texto, numero, send) {
  if (texto.includes('pagar')) {
    try {


      const pedidosDB = require('../firebase/pedidos');
      await pedidosDB.guardarPedidoEnDB(numero, carritos[numero]).then(async docRef => {
        const linkPago = await crearLinkDePago(carritos[numero], docRef.id, numero);
        await send(`🔗 *Link de pago:* ${linkPago}\n\n` +
          '⚠️ *Importante:*\n' +
          '• Paga dentro de las próximas 24 horas.\n' +
          '• Después de pagar, te enviaremos una confirmación.');

        // Limpiar carrito y estado
        carritos[numero] = [];
        estados[numero] = null;

      })

    } catch (error) {
      console.error('Error al generar pago:', error);
      await send('❌ Ocurrió un error al generar el pago. Por favor intenta de nuevo.');
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
