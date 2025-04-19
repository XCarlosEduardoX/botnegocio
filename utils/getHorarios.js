const { db } = require('../firebase/firebase');
const { BUSSINESS_NUMBER } = require('../config');

const docRef = db.collection('negocios')
    .doc(BUSSINESS_NUMBER)
    .collection('configuracion')
    .doc('configuracion');

async function getHorarios() {
    const doc = await docRef.get();

    if (!doc.exists) {
        return getHorariosPorDefecto();
    }

    const configuracion = doc.data();
    return configuracion.horarios || getHorariosPorDefecto();
}

function getHorariosPorDefecto() {
    return {
        'L': { apertura: '10:00', cierre: '17:00' },
        'M': { apertura: '10:00', cierre: '17:00' },
        'X': { apertura: '10:00', cierre: '17:00' },
        'J': { apertura: '10:00', cierre: '17:00' },
        'V': { apertura: '10:00', cierre: '17:00' }
    };
}

function obtenerDiaActual() {
    const dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return dias[new Date().getDay()];
}

module.exports = {
    getHorarios
};