const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');
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
        // Ya existe, actualizamos el stock
        const datosActuales = doc.data();
        const nuevoStock = (datosActuales.stock || 1) + stock;
        await docRef.update({ stock: nuevoStock });
    } else {
        // No existe, lo creamos
        await docRef.set({ nombre, precio, stock });
    }
}

async function eliminarProducto({ nombre }) {
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    const id = slugify(nombre);
    const docRef = ref.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
}

async function obtenerProductos() {
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    const snap = await ref.get();
    return snap.docs.map(doc => doc.data());
}

// 🔄 Actualizar un producto existente
async function actualizarProducto(id, data, numeroNegocio = BUSSINESS_NUMBER) {
    const productoRef = db.collection('negocios').doc(numeroNegocio).collection('productos').doc(id);
    return await productoRef.update(data);
}
module.exports = {
    agregarProducto,
    eliminarProducto,
    obtenerProductos,
    actualizarProducto
};
