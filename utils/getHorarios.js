const { db } = require('../firebase/firebase');
const { BUSSINESS_NUMBER } = require('../config');

const docRef = db.collection('negocios')
    .doc(BUSSINESS_NUMBER)
    .collection('configuracion')
    .doc('configuracion');

async function getHorarios() {
    const doc = await docRef.get();

    if (!doc.exists) {
        return {
            apertura: '10:00',
            cierre: '17:00'
        }
    } else {
        const configuracion = doc.data();
        return configuracion.horarios || {
            apertura: '10:00',
            cierre: '17:00'
        };
    }
}

module.exports = {
    getHorarios
};
