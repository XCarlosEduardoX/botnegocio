const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

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
    console.log('💰 Pago exitoso!');
    console.log('📦 Pedido:', session.metadata);

    // Aquí puedes:
    // 1. Actualizar tu base de datos
    // 2. Enviar un mensaje al cliente (ej: vía WhatsApp)
    // 3. Enviar un correo de confirmación
}

module.exports = router;