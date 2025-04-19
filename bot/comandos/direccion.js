module.exports = {
    name: 'direccion',
    description: 'Establece la dirección del local físico.',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) return send('Usa: direccion | Tu dirección completa');
        
        const direccion = args.trim();
        
        if (direccion.length < 10) {
            return send('❌ La dirección es demasiado corta. Por favor, proporciona una dirección más detallada.');
        }

        const configuracionDB = require('../../firebase/configuracion');
        await configuracionDB.establecerDireccion(direccion);

        return send(
            '✅ Dirección establecida correctamente:\n' +
            `📍 ${direccion}`
        );
    }
};