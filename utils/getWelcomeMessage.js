const { db } = require('../firebase/firebase');
const { BUSSINESS_NUMBER } = require('../config');

const docRef = db.collection('negocios')
    .doc(BUSSINESS_NUMBER)
    .collection('configuracion')
    .doc('configuracion');

async function getWelcomeMessage() {
    const doc = await docRef.get();

    if (!doc.exists) {
        console.log('No se encontró la configuración del negocio. Usando mensaje por defecto.');
        return '¡Hola! Bienvenido a nuestro negocio.';
    } else {
        const configuracion = doc.data();
        console.log('Configuración del negocio encontrada:', configuracion);
        return configuracion.mensajeBienvenida || '¡Hola! Bienvenido a nuestro negocio.';
    }
}

module.exports = {
    getWelcomeMessage
};
