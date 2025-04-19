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

async function establecerHorarios(horaApertura, horaCierre, dias) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        horarios: {
            apertura: horaApertura,
            cierre: horaCierre,
            dias: dias
        }
    }, { merge: true });
}

async function establecerDireccion(direccion) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        direccion: direccion
    }, { merge: true }); // Esto solo actualiza la dirección y no toca otros campos
}

module.exports = { agregarMensajeBienvenida, establecerHorarios, establecerDireccion };