const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');

async function agregarMensajeBienvenida(mensaje) {
    const docRef = db.collection('negocios')
                     .doc(BUSSINESS_NUMBER)
                     .collection('configuracion')
                     .doc('configuracion');

    await docRef.set({
        mensajeBienvenida: mensaje
    }, { merge: true }); // Esto solo actualiza mensajeBienvenida y no toca otros campos
}



module.exports = { agregarMensajeBienvenida };