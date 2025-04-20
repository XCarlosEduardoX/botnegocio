const { db } = require('../firebase/firebase');

const docRef = db.collection('negocios')
    .doc(process.env.BUSSINESS_NUMBER)
    .collection('configuracion')
    .doc('configuracion');

async function getWelcomeMessage() {
    const doc = await docRef.get();

    if (!doc.exists) {
        return '¡Hola! Bienvenido a nuestro negocio.';
    } else {
        const configuracion = doc.data();
        return configuracion.mensajeBienvenida || '¡Hola! Bienvenido a nuestro negocio.';
    }
}

module.exports = {
    getWelcomeMessage
};
