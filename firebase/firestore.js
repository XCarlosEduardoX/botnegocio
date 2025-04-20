const { db } = require('./firebase');
const cache = require('../utils/cache');

const CACHE_KEY_CARRITO = (chatId) => `carrito_${chatId}`;


const guardarCarrito = async (chatId, carrito) => {
  await db.collection('conversaciones').doc(chatId).set({ carrito }, { merge: true });
  // Actualizar caché
  cache.set(CACHE_KEY_CARRITO(chatId), carrito);
};

const obtenerCarrito = async (chatId) => {
  // Intentar obtener del caché
  const carritoCache = cache.get(CACHE_KEY_CARRITO(chatId));
  if (carritoCache) {
    return carritoCache;
  }

  // Si no está en caché, obtener de Firestore
  const doc = await db.collection('conversaciones').doc(chatId).get();
  const carrito = doc.exists ? doc.data().carrito || [] : [];

  // Guardar en caché
  cache.set(CACHE_KEY_CARRITO(chatId), carrito);

  return carrito;
};

const limpiarCarrito = async (chatId) => {
  await db.collection('conversaciones').doc(chatId).update({ carrito: [] });
  // Limpiar caché
  cache.clear(CACHE_KEY_CARRITO(chatId));
};


module.exports = { guardarCarrito, obtenerCarrito, limpiarCarrito, };
