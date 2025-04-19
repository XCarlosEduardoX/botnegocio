module.exports = {
    name: 'bienvenida',
    description: 'Envía un mensaje de bienvenida al cliente cuando inicia una conversación.',
    adminOnly: true,

    async execute({ args, send }) {
        let mensaje = args
        if (!mensaje) return send('Usa: bienvenida | mensaje');
        mensaje = mensaje.trim();

        const configuracionDB = require('../../firebase/configuracion');
        await configuracionDB.agregarMensajeBienvenida(mensaje);

        return send('✅Mensaje de bienvenida agregado correctamente.');
    }
};
