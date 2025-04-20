const { db } = require('../firebase/firebase');

const docRef = db.collection('negocios')
    .doc(process.env.BUSSINESS_NUMBER)
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