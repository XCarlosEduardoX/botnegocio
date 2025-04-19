require('dotenv').config();
require('./bot/index'); // Inicia el bot de WhatsApp

// Si tienes Stripe webhook, lo importas aquí y lo montas con Express
// const express = require('express');
// const webhook = require('./stripe/webhook');
// const app = express();
// app.use('/webhook', webhook);
// app.listen(3000);
