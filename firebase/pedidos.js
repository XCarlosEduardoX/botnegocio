const { db } = require('./firebase');
const { BUSSINESS_NUMBER } = require('../config');

async function guardarPedidoEnDB(numero, carrito, linkPago) {
    console.log('Guardando pedido en DB:', numero, carrito, linkPago);
    await db.collection('negocios').doc(BUSSINESS_NUMBER).collection('pedidos').add({
        cliente: numero,
        carrito,
        linkPago,
        fecha: new Date().toISOString(),
        estado: 'pendiente'
    });
}

module.exports = { guardarPedidoEnDB };