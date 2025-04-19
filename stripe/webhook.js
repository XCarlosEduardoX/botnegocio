const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const { OWNER_NUMBERS } = require('../config');
// Middleware para parsear el cuerpo raw
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // 1. Verifica la firma del webhook
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Maneja eventos relevantes
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            await handlePaymentSuccess(session);
            break;

        case 'checkout.session.expired':
            console.log('❌ Pago expirado:', event.data.object.id);
            break;

        default:
            console.log(`🔔 Evento no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true });
});

// Función para manejar pagos exitosos
async function handlePaymentSuccess(session) {
    const { cliente, docId } = session.metadata;
    const numeroWhatsApp = `${cliente}@c.us`;

    const mensajeConfirmacionCliente =
        '✅ *¡Pago confirmado!*\n\n' +
        `📦 Pedido: ${session.metadata.carrito}\n` +
        'Gracias por tu compra.';

    const mensajeConfirmacionNegocio = `✅ *¡Pago confirmado!*\n\n` +
        `📦 Pedido: ${session.metadata.carrito}\n` +
        `💳 Monto: $${(session.amount_total / 100).toFixed(2)}\n` +
        `🛒 Cliente: +${cliente}\n` +
        `🛍️ ID de pedido: ${docId}`;


    try {
        // 1. Agregar a cola
        const mensajesDB = require('../firebase/mensajes');
        await mensajesDB.agregarMensajeEnCola({
            numero: numeroWhatsApp,
            mensaje: mensajeConfirmacionCliente
        });

        // 2. Enviar mensaje a negocio
        for (const numero of OWNER_NUMBERS) {
            await mensajesDB.agregarMensajeEnCola({
                numero: numero,
                mensaje: mensajeConfirmacionNegocio
            });
        }
        // 2. Actualizar estado en Firebase
        const pedidosDB = require('../firebase/pedidos');
        await pedidosDB.actualizarEstatusPedido(docId, 'pagado');

        console.log('✅ Procesamiento exitoso');
    } catch (error) {
        console.error('Error en handlePaymentSuccess:', error);
    }
}

module.exports = router;