require('dotenv').config();
const express = require('express');
const app = express();

const { guardarEstadoConversacion } = require('./firebase/conversacionEstados');

// Inicia tu bot de WhatsApp
require('./bot/index');

// Configura el webhook de Stripe
const webhook = require('./stripe/webhook');
app.use('/webhook', webhook);


app.get('/success', async (req, res) => {
  const { pedido, cliente } = req.query;

  try {


    // Reiniciar estado de la conversación
    await guardarEstadoConversacion(cliente, null);

    // Enviar mensaje de confirmación al cliente
    // const mensaje = '¡Pago recibido! Gracias por tu compra. 🎉';
    // await cliente.sendMessage(mensaje);

    res.send('¡Pago exitoso!');

  } catch (error) {
    console.error('Error procesando pago exitoso:', error);
    res.status(500).send('Error procesando el pago');
  }
});


app.get('/cancel', (req, res) => {
  const { cliente } = req.query;
  // Reiniciar estado de la conversación

  res.send('Pago cancelado. Puedes intentar nuevamente.');
});

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor webhook escuchando en puerto ${PORT}`);
});