const { db } = require('./firebase');

async function agregarMensajeBienvenida(mensaje) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        mensajeBienvenida: mensaje
    }, { merge: true }); // Esto solo actualiza mensajeBienvenida y no toca otros campos
}

async function establecerHorarios(horaApertura, horaCierre, dias) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
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
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return null;

    return doc.data().horarios || null;
}

// Modificar la función establecerHorarios existente para que acepte un objeto completo
async function establecerHorarios(horarios) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        horarios: horarios
    }, { merge: true });
}


async function establecerDireccion(direccion) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        direccion: direccion
    }, { merge: true }); // Esto solo actualiza la dirección y no toca otros campos
}


async function establecerTiposEntrega(tipos) {
    const negocioRef = db.collection('negocios').doc(process.env.BUSSINESS_NUMBER);
    const configRef = negocioRef.collection('configuracion').doc('configuracion');

    await configRef.set({
        tiposEntrega: tipos
    }, { merge: true });
}
async function obtenerEstadoTemporal() {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return false;

    return doc.data().cerradoTemporalmente || false;
}

async function establecerEstadoTemporal(estado) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        cerradoTemporalmente: estado
    }, { merge: true });
}

async function establecerDatosTransferencia(datos) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        datosTransferencia: datos
    }, { merge: true });
}

//obtener datos de transferencia
async function obtenerDatosTransferencia() {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return null;

    return doc.data().datosTransferencia || null;
}

async function establecerNombreNegocio(nombre) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        nombreNegocio: nombre
    }, { merge: true });
}
async function establecerPropietario(numero) {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    await docRef.set({
        propietarios: [numero] // Solo guarda un número en la posición 0
    }, { merge: true });
}


async function obtenerPropietarios() {
    const docRef = db.collection('negocios')
        .doc(process.env.BUSSINESS_NUMBER)
        .collection('configuracion')
        .doc('configuracion');

    const doc = await docRef.get();
    if (!doc.exists) return [];

    return doc.data().propietarios || [];
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
    obtenerDatosTransferencia,
    establecerNombreNegocio,
    establecerPropietario,
    obtenerPropietarios
};