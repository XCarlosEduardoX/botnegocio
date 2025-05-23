const { cargarComandos } = require('../services/botService');
const comandos = cargarComandos();
const productosDB = require('../firebase/productos');
const { crearLinkDePago } = require('../stripe/stripe');
const { db } = require('../firebase/firebase');
const { getHorarios } = require('../utils/getHorarios');
const moment = require('moment');
const { guardarEstadoConversacion, recuperarEstadoConversacion } = require('../firebase/conversacionEstados');
const configuracionDB = require('../firebase/configuracion');

// // Estados en memoria para clientes
// const estados = {}; // { '521234567890': 'esperando_producto' | 'esperando_confirmacion' }
// const carritos = {}; // { '521234567890': [{ nombre, cantidad, precio }] }
// const mensajesPineados = {}; // { '521234567890': messageId }
const { getCierreTemporal } = require('../utils/getCierreTemporal');

async function manejarMensaje(message, chatId, send, client) {
  try {
    const texto = message.body.trim();
    const numero = chatId.replace('@c.us', '');

    if (texto === 'cancelar') {
      // Si hay un link de pago pendiente (estado esperando_confirmacion_pago)
      if (estados[numero] === 'esperando_confirmacion_pago') {
        // Aquí podrías agregar lógica adicional para cancelar el link de pago si es necesario
        const pedidosDB = require('../firebase/pedidos');
        await pedidosDB.actualizarEstatusPedido(pedidoActualId, 'cancelado');
      }

      return await cancelarPedido(numero, send);
    }



    if (!carritos[numero]) {
      carritos[numero] = [];
    }
    if (!estados[numero]) {
      const estadoGuardado = await recuperarEstadoConversacion(numero);
      if (estadoGuardado) {
        estados[numero] = estadoGuardado.estado;
        carritos[numero] = estadoGuardado.carrito || [];
      } else {
        // Si no hay estado guardado, inicializar con valores por defecto
        estados[numero] = '';
        carritos[numero] = [];
        // Guardar estado inicial en Firebase
        await guardarEstadoConversacion(numero, estados[numero], carritos[numero]);
      }
    }

    if (estados[numero] === 'esperando_metodo_pago') {
      return manejarMetodoPago(texto, numero, send);
    }

    if (estados[numero] === 'esperando_confirmacion_pago') {
      return manejarConfirmacionPago(texto, numero, send); // Nueva función específica
    }

    const propietarios = await configuracionDB.obtenerPropietarios();
    const esAdmin = propietarios.includes(numero);
    console.log('Número:', numero, 'Texto:', texto, 'Es admin:', esAdmin);


    if (!esAdmin) {
      const cierreTemporal = await getCierreTemporal();
      if (cierreTemporal) {
        return send('🔒 El negocio está cerrado temporalmente. No se aceptan pedidos en estos momentos');
      }


      const diasSemana = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      const diaActual = diasSemana[new Date().getDay()];
      const horaActual = new Date().getHours();
      const minutosActual = new Date().getMinutes();

      // Obtener horarios
      const horarios = await getHorarios();

      // Verificar si hay horario para el día actual
      if (!horarios[diaActual]) {
        const ordenDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

        let mensajeHorarios = '📅 *Horarios de atención:*\n\n';

        ordenDias.forEach(dia => {
          if (horarios[dia]) {
            const apertura12h = moment(horarios[dia].apertura, 'HH:mm').format('hh:mm A');
            const cierre12h = moment(horarios[dia].cierre, 'HH:mm').format('hh:mm A');
            mensajeHorarios += `${dia}: ${apertura12h} - ${cierre12h}\n`;
          }
        });

        return client.sendMessage(
          message.from,
          `⏰ No hay atención hoy.\n\n${mensajeHorarios}`
        );
      }

      // Si hay horario para el día actual, verificar si está dentro del horario
      const horarioDia = horarios[diaActual];
      const [horaApertura, minutosApertura] = horarioDia.apertura.split(':').map(Number);
      const [horaCierre, minutosCierre] = horarioDia.cierre.split(':').map(Number);

      const tiempoActual = horaActual * 60 + minutosActual;
      const tiempoApertura = horaApertura * 60 + minutosApertura;
      const tiempoCierre = horaCierre * 60 + minutosCierre;

      // En conversacionHandler.js, modifica la parte donde se construye el mensaje de horarios:

      if (tiempoActual < tiempoApertura || tiempoActual > tiempoCierre) {
        // Definir el orden correcto de los días
        const ordenDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

        // Crear mensaje con todos los horarios disponibles
        let mensajeHorarios = '📅 *Horarios de atención:*\n\n';

        // Iterar sobre el orden definido de los días
        ordenDias.forEach(dia => {
          if (horarios[dia]) {
            const apertura12h = moment(horarios[dia].apertura, 'HH:mm').format('hh:mm A');
            const cierre12h = moment(horarios[dia].cierre, 'HH:mm').format('hh:mm A');
            mensajeHorarios += `${dia}: ${apertura12h} - ${cierre12h}\n`;
          }
        });

        return client.sendMessage(
          message.from,
          `⏰ Fuera de horario.\n\n${mensajeHorarios}`
        );
      }
    }
    if (texto.startsWith('agregar varios')) {
      comandoNombre = 'agregar varios';
      args = texto.replace('agregar varios', '').trim();
    } else {
      const [comandoRaw, ...argsRaw] = texto.split('|');
      comandoNombre = comandoRaw.trim().toLowerCase();
      args = argsRaw.join('|').trim();
    }

    if (comandos[comandoNombre]) {
      if (comandos[comandoNombre].adminOnly && !esAdmin) {
        return send('🚫 No tienes permiso para usar este comando.');
      }
      return await comandos[comandoNombre].execute({
        args,
        send,
        message,  // Agregar el objeto message
        client    // También podría ser útil pasar el cliente
      });
    }
    await guardarEstadoConversacion(numero, estados[numero], carritos[numero]);

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
  let producto = productos.find(p =>
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
  await guardarEstadoConversacion(numero, estados[numero], carritos[numero]);
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
      resumen += '3. 💳 Tarjeta\n\n';
      resumen += 'Escribe el número o nombre del método:';

      estados[numero] = 'esperando_metodo_pago'; // Cambiar estado directamente aquí
      return await send(resumen);
    }
    else if (mensaje.includes('cancelar') || mensaje.includes('cancela') && mensaje.includes('cancelar') || mensaje.includes('cancela') && mensaje.includes('cancela')) {

      await cancelarPedido(numero, send);
    } else {
      return await send('❌ Opción no válida. Por favor escribe *agregar* o *terminar*.');
    }
  }
}

async function manejarMetodoPago(texto, numero, send) {
  console.log('Manejando metodo de pago:', texto);
  const metodo = texto.trim().toLowerCase();
  if (metodo === 'cancelar' || metodo === 'cancela' && texto.includes('cancelar') || metodo === 'cancela' && texto.includes('cancela')) {
    return await cancelarPedido(numero, send);
  } else
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
      try {
        // Obtener los datos de transferencia de la configuración
        const configuracionDB = require('../firebase/configuracion');
        const datosTransferencia = await configuracionDB.obtenerDatosTransferencia();

        if (!datosTransferencia) {
          return await send('❌ Los datos de transferencia no están configurados. Por favor contacta al administrador.');
        }

        // Guardar pedido en Firebase como "pendiente de pago"
        const pedidosDB = require('../firebase/pedidos');
        await pedidosDB.guardarPedidoEnDB(numero, carritos[numero], 'transferencia');


        await send(
          '📤 *Datos para transferencia:*\n\n' +
          `• Banco: ${datosTransferencia.banco}\n` +
          `• Cuenta: ${datosTransferencia.numeroCuenta}\n` +
          `• Titular: ${datosTransferencia.titular}\n\n` +
          `⚠️ *Importante:*\n\n ` +
          `• Envía el comprobante al numero +${process.env.BUSSINESS_NUMBER} para validar tu pago.\n` +
          `• Por favor, indica tu número de teléfono como referencia de pago: ${numero}.\n\n` +
          '📦 *Tu pedido:*\n' +
          generarResumenCarrito(carritos[numero])
        );

        // Limpiar carrito y estado
        carritos[numero] = [];
        estados[numero] = null;

      } catch (error) {
        console.error('Error al procesar pago por transferencia:', error);
        await send('❌ Ocurrió un error. Por favor intenta nuevamente.');
      }
    }
    else if (metodo.includes('tarjeta') || metodo === '3') {
      try {
        const pedidosDB = require('../firebase/pedidos');
        const docRef = await pedidosDB.guardarPedidoEnDB(numero, carritos[numero], 'tarjeta');
        console.log('1:', docRef);
        const linkPago = await crearLinkDePago(carritos[numero], docRef.id, numero);

        await send(
          '🔗 *Link de pago (Stripe):*\n' +
          linkPago + '\n\n' +
          '⚠️ Válido por 24 horas\n' +
          '• Aceptamos todas las tarjetas\n' +
          'Escribe *cancelar* o *cancela* para cancelar el pedido.'

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
        '3. 💳 Tarjeta'
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
          '3. 💳 Tarjeta (Pago en línea)\n\n' +
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

      } else if (metodo.includes('tarjeta') || metodo === '3') {
        // Guardar pedido en Firebase y generar link de pago
        const pedidosDB = require('../firebase/pedidos');
        const docRef = await pedidosDB.guardarPedidoEnDB(numero, carritos[numero]);
        console.log('2:', docRef);
        const linkPago = await crearLinkDePago(carritos[numero], docRef.id, numero);

        await send(
          '🔗 *Link de pago generado (Tarjeta):*\n' +
          `${linkPago}\n\n` +
          '⚠️ *Instrucciones:*\n' +
          '• Válido por 24 horas\n' +
          '• Aceptamos todas las tarjetas\n'
        );

        // Limpiar carrito y estado
        carritos[numero] = [];
        estados[numero] = null;

      } else {
        return await send(
          '❌ Método no reconocido. Por favor elige:\n\n' +
          '1. Efectivo\n' +
          '2. Transferencia\n' +
          '3. Tarjeta (Pago en línea)'
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
  console.log('Procesando metodo de pago:', texto);
  const metodo = texto.trim().toLowerCase();

  if (metodo.includes('efectivo') || metodo === '1') {
    estados[numero] = null; // ¡ImPor favor, indica tu número de teléfono como referencia de pagoante! Resetear estado
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
      `⚠️ *ImPor favor, indica tu número de teléfono como referencia de pagoante:*\n\n ` +
      `• Envía el comprobante al numero +${process.env.BUSSINESS_NUMBER} para validar tu pago.\n` +
      `• Por favor, indica tu número de teléfono como referencia de pago: ${numero}.\n\n` +
      '📦 *Tu pedido:*\n' +
      generarResumenCarrito(carritos[numero])
    );
    carritos[numero] = [];

  } else if (metodo.includes('tarjeta') || metodo === '3') {
    try {
      const pedidosDB = require('../firebase/pedidos');
      const docRef = await pedidosDB.guardarPedidoEnDB(numero, carritos[numero]);
      console.log('3:', docRef);
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
      '3. 💳 Tarjeta'
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


async function cancelarPedido(numero, send) {
  try {
    // Limpiar carrito
    carritos[numero] = [];

    // Resetear estado
    estados[numero] = 'esperando_producto';

    // Guardar el nuevo estado en Firebase
    await guardarEstadoConversacion(numero, estados[numero], carritos[numero]);

    // Enviar mensaje de confirmación
    await send('🚫 Pedido cancelado. Mostrando productos disponibles:');

    // Mostrar productos nuevamente
    await enviarListaDeProductos(numero, send);

    return true;
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
    await send('⚠️ Ocurrió un error al cancelar el pedido.');
    return false;
  }
}
module.exports = { manejarMensaje, procesarMetodoPago };
