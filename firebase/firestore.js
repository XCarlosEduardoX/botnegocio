const { db } = require('./firebase');

const guardarCarrito = async (chatId, carrito) => {
  await db.collection('conversaciones').doc(chatId).set({ carrito }, { merge: true });
};

const obtenerCarrito = async (chatId) => {
  const doc = await db.collection('conversaciones').doc(chatId).get();
  return doc.exists ? doc.data().carrito || [] : [];
};

const limpiarCarrito = async (chatId) => {
  await db.collection('conversaciones').doc(chatId).update({ carrito: [] });
};



module.exports = { guardarCarrito, obtenerCarrito, limpiarCarrito };
