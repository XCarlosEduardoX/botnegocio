module.exports = {
    name: 'propietario',
    description: 'Establece el número del propietario del negocio',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) return send('Usa: propietario | número (ejemplo: 5214775579264)');
        
        const numero = args.trim();
        
        // Validar formato del número
        if (!/^\d{10,}$/.test(numero)) {
            return send('❌ El número debe contener solo dígitos y tener al menos 10 caracteres.');
        }

        // Importar configuración de Firebase
        const configuracionDB = require('../../firebase/configuracion');
        
        try {
            // Guardar el número en la base de datos
            await configuracionDB.establecerPropietario(numero);
            
            return send(`✅ Número del propietario establecido: ${numero}`);
        } catch (error) {
            console.error('Error al establecer número del propietario:', error);
            return send('❌ Ocurrió un error al establecer el número del propietario.');
        }
    }
};