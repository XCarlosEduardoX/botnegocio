require('dotenv').config();
const express = require('express');
const app = express();

// Inicia tu bot de WhatsApp
require('./bot/index');

// Configura el webhook de Stripe
const webhook = require('./stripe/webhook');
app.use('/webhook', webhook);

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor webhook escuchando en puerto ${PORT}`);
});