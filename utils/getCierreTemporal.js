const { db } = require('../firebase/firebase');
const { BUSSINESS_NUMBER } = require('../config');

const docRef = db.collection('negocios')
    .doc(BUSSINESS_NUMBER)
    .collection('configuracion')
    .doc('configuracion');

async function getCierreTemporal() {
    const doc = await docRef.get();

    if (!doc.exists) {
        return getCierreTemporal();
    }

    const configuracion = doc.data();
    return configuracion.cerradoTemporalmente ?? getCierreTemporalPorDefecto();
}
function getCierreTemporalPorDefecto() {
    return false
}


module.exports = {
    getCierreTemporal
};