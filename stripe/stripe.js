const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const crearLinkDePago = async (carrito) => {
  const line_items = carrito.map(producto => ({
    price_data: {
      currency: 'mxn',
      product_data: { name: producto.nombre },
      unit_amount: producto.precio * 100,
    },
    quantity: producto.cantidad,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: 'https://tutienda.com/pago-exitoso',
    cancel_url: 'https://tutienda.com/pago-cancelado',
  });

  return session.url;
};

module.exports = { crearLinkDePago };
