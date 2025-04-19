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
    console.log('Actualizando estado del pedido:', docId, estatus);
    await db.collection('negocios').doc(BUSSINESS_NUMBER).collection('pedidos').doc(docId).update({
        estado: estatus
    }).catch(error => {
        console.error('Error al actualizar estado del pedido:', error);
    });
}


//obtener pedidos con estado "pagado"
async function obtenerPedidosCompletados() {
    const snapshot = await db.collection('negocios').doc(BUSSINESS_NUMBER).collection('pedidos')
        .where('estado', '==', 'pagado')
        .get();

    const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return pedidos;
}

module.exports = { guardarPedidoEnDB, actualizarEstatusPedido, obtenerPedidosCompletados };