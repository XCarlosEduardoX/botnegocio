// En tu archivo ../firebase/mensajes.js
const admin = require('firebase-admin');
const db = admin.firestore();

const agregarMensajeEnCola = async (mensajeData) => {
    try {
        const docRef = await db.collection('negocios').doc(process.env.BUSSINESS_NUMBER).collection('mensajes_pendientes').add({
            numero: mensajeData.numero,       // Ej: "5214775579264@c.us"
            mensaje: mensajeData.mensaje,     // Contenido del mensaje
            status: 'pendiente',              // Estado del mensaje
            timestamp: admin.firestore.FieldValue.serverTimestamp(), // Fecha automática
            intentos: 0                       // Contador de reintentos
        });

        console.log('Mensaje agregado a cola con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar mensaje a cola:', error);
        throw error;
    }
};

module.exports = {
    agregarMensajeEnCola
};