const { obtenerCarrito, guardarCarrito, limpiarCarrito } = require('../firebase/firestore');

const agregarAlCarrito = async (chatId, producto) => {
  const carrito = await obtenerCarrito(chatId);
  const index = carrito.findIndex(p => p.nombre === producto.nombre);

  if (index !== -1) carrito[index].cantidad += producto.cantidad;
  else carrito.push(producto);

  await guardarCarrito(chatId, carrito);
};

module.exports = { agregarAlCarrito };
