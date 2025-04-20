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
async function obtenerHorarios() {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return null;

    return doc.data().horarios || null;
}

// Modificar la función establecerHorarios existente para que acepte un objeto completo
async function establecerHorarios(horarios) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        horarios: horarios
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


async function establecerTiposEntrega(tipos) {
    const negocioRef = db.collection('negocios').doc(BUSSINESS_NUMBER);
    const configRef = negocioRef.collection('configuracion').doc('configuracion');

    await configRef.set({
        tiposEntrega: tipos
    }, { merge: true });
}
async function obtenerEstadoTemporal() {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return false;

    return doc.data().cerradoTemporalmente || false;
}

async function establecerEstadoTemporal(estado) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        cerradoTemporalmente: estado
    }, { merge: true });
}

async function establecerDatosTransferencia(datos) {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        datosTransferencia: datos
    }, { merge: true });
}

//obtener datos de transferencia
async function obtenerDatosTransferencia() {
    const docRef = db.collection('negocios')
        .doc(BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return null;

    return doc.data().datosTransferencia || null;
}

module.exports = {
    agregarMensajeBienvenida,
    establecerHorarios,
    establecerDireccion,
    establecerTiposEntrega,
    obtenerHorarios,
    obtenerEstadoTemporal,
    establecerEstadoTemporal,
    establecerDatosTransferencia,
    obtenerDatosTransferencia
};