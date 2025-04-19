module.exports = {
    name: 'tipo entrega',
    description: 'Establece los tipos de entrega disponibles (local/domicilio/digital)',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) return send(
            'Usa: tipo entrega | tipo1,tipo2,tipo3\n' +
            'Tipos válidos: local, domicilio, digital\n' +
            'Ejemplo: tipo entrega | local,domicilio'
        );

        const tiposIngresados = args.trim().split(',').map(t => t.trim().toLowerCase());
        
        // Validar tipos de entrega
        const tiposValidos = ['local', 'domicilio', 'digital'];
        const tiposInvalidos = tiposIngresados.filter(t => !tiposValidos.includes(t));
        
        if (tiposInvalidos.length > 0) {
            return send(`❌ Tipos de entrega inválidos: ${tiposInvalidos.join(', ')}`);
        }

        // Agregar función en configuracionDB
        const configuracionDB = require('../../firebase/configuracion');
        await configuracionDB.establecerTiposEntrega(tiposIngresados);

        return send(
            '✅ Tipos de entrega establecidos correctamente:\n' +
            `📦 Tipos: ${tiposIngresados.join(', ')}`
        );
    }
};