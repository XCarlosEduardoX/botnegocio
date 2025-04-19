module.exports = {
    name: 'cerrartemporalmente',
    description: 'Cierra o abre temporalmente el negocio',
    adminOnly: true,

    async execute({ send }) {
        try {
            const configuracionDB = require('../../firebase/configuracion');

            // Obtener estado actual
            const estadoActual = await configuracionDB.obtenerEstadoTemporal();

            // Cambiar al estado opuesto
            const nuevoEstado = !estadoActual;

            // Guardar nuevo estado
            await configuracionDB.establecerEstadoTemporal(nuevoEstado);

            // Enviar confirmación solo al admin
            if (nuevoEstado) {
                await send('🔒 Negocio cerrado temporalmente. No se aceptarán pedidos.');
            } else {
                await send('🔓 Negocio abierto nuevamente. Se aceptan pedidos.');
            }

        } catch (error) {
            console.error('Error al cambiar estado temporal:', error);
            return send('❌ Error al cambiar el estado del negocio');
        }
    }
};