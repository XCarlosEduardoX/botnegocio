const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');

async function agregarProducto({ nombre, precio }) {
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    await ref.doc(nombre.toLowerCase()).set({ nombre, precio });
}

async function eliminarProducto({ nombre }) {
    const ref = db.collection('negocios').doc(BUSSINESS_NUMBER).collection('productos');
    const docRef = ref.doc(nombre.toLowerCase());
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

module.exports = {
    agregarProducto,
    eliminarProducto,
    obtenerProductos
};
