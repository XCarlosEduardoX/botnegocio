const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');
const cache = require('../utils/cache');

const CACHE_KEY_PRODUCTOS = 'productos';

function slugify(texto) {
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
        .replace(/\s+/g, '-')     // espacios por guiones
        .replace(/[^\w\-]+/g, '') // quitar caracteres no válidos
        .replace(/\-\-+/g, '-')   // eliminar guiones repetidos
        .replace(/^-+/, '')       // quitar guiones al inicio
        .replace(/-+$/, '');      // quitar guiones al final
}

async function agregarProducto({ nombre, precio, stock = 1 }) {
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    const id = slugify(nombre);
    const docRef = ref.doc(id);
    const doc = await docRef.get();

    if (doc.exists) {
        const datosActuales = doc.data();
        const nuevoStock = (datosActuales.stock || 1) + stock;
        await docRef.update({ stock: nuevoStock });
    } else {
        await docRef.set({ nombre, precio, stock });
    }

    // Invalidar caché después de modificar productos
    cache.clear(CACHE_KEY_PRODUCTOS);
}


async function eliminarProducto({ nombre }) {
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    const id = slugify(nombre);
    const docRef = ref.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();

    // Invalidar caché después de eliminar
    cache.clear(CACHE_KEY_PRODUCTOS);
    return true;
}

async function obtenerProductos() {
    // Intentar obtener del caché primero
    const productosCache = cache.get(CACHE_KEY_PRODUCTOS);
    if (productosCache) {
        console.log('Productos obtenidos desde caché');
        return productosCache;
    }

    // Si no está en caché, obtener de Firestore
    console.log('Obteniendo productos desde Firestore');
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    const snap = await ref.get();
    const productos = snap.docs.map(doc => doc.data());

    // Guardar en caché
    cache.set(CACHE_KEY_PRODUCTOS, productos);

    return productos;
}

// 🔄 Actualizar un producto existente

async function actualizarProducto(id, data, numeroNegocio = BUSSINESS_NUMBER) {
    const productoRef = db.collection('negocios').doc(numeroNegocio).collection('productos').doc(id);
    await productoRef.update(data);

    // Invalidar caché después de actualizar
    cache.clear(CACHE_KEY_PRODUCTOS);
}
module.exports = {
    agregarProducto,
    eliminarProducto,
    obtenerProductos,
    actualizarProducto
};
