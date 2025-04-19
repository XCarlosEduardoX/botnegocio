// En tu archivo stripe.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const crearLinkDePago = async (carrito) => {
    try {
        const line_items = carrito.map(producto => ({
            price_data: {
                currency: 'mxn',
                product_data: { 
                    name: producto.nombre,
                    // Opcional: añade más detalles como imágenes o descripción
                    // images: [producto.imagenUrl],
                },
                unit_amount: Math.round(producto.precio * 100), // Asegura que sea entero
            },
            quantity: producto.cantidad,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: 'https://tutienda.com/pago-exitoso?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://tutienda.com/pago-cancelado',
            metadata: { // Útil para identificar el pedido después
                clienteId: '123', // Puedes pasar el número de WhatsApp aquí
                carrito: JSON.stringify(carrito.map(item => `${item.nombre} x${item.cantidad}`))
            }
        });

        return session.url;
    } catch (error) {
        console.error('Error en crearLinkDePago:', error);
        throw new Error('No se pudo generar el link de pago');
    }
};

module.exports = { crearLinkDePago };