module.exports = {
    name: 'nombre negocio',
    description: 'Establece el nombre del negocio',
    adminOnly: true,

    async execute({ args, send }) {
        // Validar que se proporcionó un nombre
        if (!args) return send('Usa: nombre negocio | Nombre del negocio');
        
        const nombreNegocio = args.trim();
        
        // Validar longitud mínima del nombre
        if (nombreNegocio.length < 3) {
            return send('❌ El nombre del negocio debe tener al menos 3 caracteres.');
        }

        // Importar configuración de Firebase
        const configuracionDB = require('../../firebase/configuracion');
        
        try {
            // Guardar el nombre en la base de datos
            await configuracionDB.establecerNombreNegocio(nombreNegocio);
            
            return send(`✅ Nombre del negocio establecido como: "${nombreNegocio}"`);
        } catch (error) {
            console.error('Error al establecer nombre del negocio:', error);
            return send('❌ Ocurrió un error al establecer el nombre del negocio.');
        }
    }
};