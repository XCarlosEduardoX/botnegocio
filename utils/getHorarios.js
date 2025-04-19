const { db } = require('../firebase/firebase');
const { BUSSINESS_NUMBER } = require('../config');

const docRef = db.collection('negocios')
    .doc(BUSSINESS_NUMBER)
    .collection('configuracion')
    .doc('configuracion');

async function getHorarios() {
    const doc = await docRef.get();
    const diaActual = obtenerDiaActual();

    if (!doc.exists) {
        return getHorariosPorDefecto();
    }

    const configuracion = doc.data();
    const horarios = configuracion.horarios || {};

    // Si existe un horario específico para el día actual, usarlo
    if (horarios[diaActual]) {
        return {
            apertura: horarios[diaActual].apertura,
            cierre: horarios[diaActual].cierre,
            dias: Object.keys(horarios) // Retorna todos los días configurados
        };
    }

    return getHorariosPorDefecto();
}

function getHorariosPorDefecto() {
    return {
        apertura: '10:00',
        cierre: '17:00',
        dias: ['L', 'M', 'X', 'J', 'V']
    };
}

function obtenerDiaActual() {
    const dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return dias[new Date().getDay()];
}

module.exports = {
    getHorarios
};