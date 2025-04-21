const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const pedidosDB = require('../firebase/pedidos');
const configuracionDB = require('../firebase/configuracion');
const moment = require('moment');
require('moment/locale/es'); // Cargar idioma español
const { guardarEstadoConversacion } = require('../firebase/conversacionEstados');

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
        case 'checkout.session.async_payment_succeeded':
            const session = event.data.object;
            if (session.payment_status === 'paid') await handlePaymentSuccess(session);
            break;

        case 'checkout.session.expired':
            console.log('❌ Pago expirado:', event.data.object.id);
            break;

        case 'payment_intent.requires_action':
            const paymentData = event.data.object;
            console.log('Pago requiere acción:', paymentData);
            if (paymentData.payment_method_types[0] === 'oxxo' && paymentData.status === 'requires_action') {
                await handleOxxoPayment(paymentData);
            }
            break;

        default:
            // Puede agregar un registro o mensaje para los tipos no manejados
            console.log('Evento no manejado:', event.type);
    }

    res.status(200).json({ received: true });
});

// Función para manejar pagos exitosos
async function handlePaymentSuccess(session) {
    console.log('handlePaymentSuccess:', session);
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
        await pedidosDB.actualizarEstatusPedido(docId, 'pagado');
        await guardarEstadoConversacion(numeroWhatsApp, null, []); // Reiniciar estado de la conversación
        // 1. Agregar a cola
        const mensajesDB = require('../firebase/mensajes');
        await mensajesDB.agregarMensajeEnCola({
            numero: numeroWhatsApp,
            mensaje: mensajeConfirmacionCliente
        });

        // 2. Enviar mensaje a negocio
        const propietarios = await configuracionDB.obtenerPropietarios();
        for (const numero of propietarios) {
            await mensajesDB.agregarMensajeEnCola({
                numero: numero,
                mensaje: mensajeConfirmacionNegocio
            });
        }
        // 2. Actualizar estado en Firebase


        console.log('✅ Procesamiento exitoso');
    } catch (error) {
        console.error('Error en handlePaymentSuccess:', error);
    }
}

async function handleOxxoPayment(paymentData) {
    const { cliente } = paymentData.metadata;
    console.log('Cliente Oxxo:', cliente);


    const voucher_url = paymentData.next_action?.oxxo_display_details?.hosted_voucher_url; // Optional chaining
    console.log('Voucher URL:', voucher_url);
    const expire_days = paymentData.payment_method_options?.oxxo?.expires_after_days; // Optional chaining
    console.log('Días de expiración:', expire_days);
    if (!voucher_url || !expire_days) {
        console.error("Missing Oxxo payment details:", paymentData);
        return;
    }
    const expire_date = moment().add(expire_days, 'days').locale('es').format('LL'); // Ej: 23 de abril de 2025
    console.log('Expira el:', expire_date);
    // 1. Agregar a cola    
    const mensajesDB = require('../firebase/mensajes');
    await mensajesDB.agregarMensajeEnCola({
        numero: cliente,
        mensaje: `🔔 Pago con Oxxo.
        Tu voucher está disponible en el siguiente enlace: ${voucher_url}
        El pago expirará el ${expire_date}.

        La confirmación del pago puede tardar hasta 2 días. Si no recibes la confirmación, por favor contacta al negocio.  
        `
    });
}

module.exports = router;