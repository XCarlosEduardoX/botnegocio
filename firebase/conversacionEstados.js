// firebase/conversacionEstados.js
const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');

async function guardarEstadoConversacion(numero, estado, carrito) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('conversaciones')
        .doc(numero);

    // Asegurarse de que carrito sea un array válido
    const carritoValido = Array.isArray(carrito) ? carrito : [];

    await docRef.set({
        estado: estado || null,
        carrito: carritoValido,
        ultimaActualizacion: new Date().toISOString()
    }, { merge: true });
}

async function recuperarEstadoConversacion(numero) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('conversaciones')
        .doc(numero);

    const doc = await docRef.get();
    return doc.exists ? doc.data() : null;
}

module.exports = { guardarEstadoConversacion, recuperarEstadoConversacion };