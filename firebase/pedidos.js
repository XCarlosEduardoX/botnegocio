const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');

async function guardarPedidoEnDB(numero, carrito) {
    console.log('Guardando pedido en DB:', numero, carrito);
    const docRef = await db.collection('negocios').doc(BUSSINESS_NUMBER).collection('pedidos').add({
        cliente: numero,
        carrito,
        fecha: new Date().toISOString(),
        estado: 'pendiente'
    });
    return docRef; // <-- ¡Agregado!
}


//actualiza el estado del pedido a "pagado"
async function actualizarEstatusPedido(docId, estatus) {
    await db.collection('negocios').doc(BUSSINESS_NUMBER).collection('pedidos').doc(docId).update({
        estado: estatus
    });
}

module.exports = { guardarPedidoEnDB, actualizarEstatusPedido };