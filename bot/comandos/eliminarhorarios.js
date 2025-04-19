module.exports = {
    name: 'eliminarhorarios',
    description: 'Elimina horarios específicos del bot',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) {
            return send(
                'Formato correcto:\n' +
                'eliminarhorarios | días\n' +
                'Ejemplo: eliminarhorarios | L,M,X\n\n' +
                'L=Lunes, M=Martes, X=Miércoles\n' +
                'J=Jueves, V=Viernes, S=Sábado, D=Domingo'
            );
        }

        const partes = args.trim().split('|').map(p => p.trim());

        if (partes.length !== 1) {
            return send('❌ Formato incorrecto. Usa: eliminarhorarios | L,M,X');
        }

        const diasAEliminar = partes[0].split(',').map(d => d.trim().toUpperCase());
        
        // Validar días
        const diasValidos = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const diasInvalidos = diasAEliminar.filter(d => !diasValidos.includes(d));
        
        if (diasInvalidos.length > 0) {
            return send(`❌ Días inválidos: ${diasInvalidos.join(', ')}`);
        }

        try {
            const configuracionDB = require('../../firebase/configuracion');
            
            // Obtener horarios actuales
            const horariosActuales = await configuracionDB.obtenerHorarios() || {};
            
            // Eliminar los días especificados
            diasAEliminar.forEach(dia => {
                delete horariosActuales[dia];
            });

            // Guardar los horarios actualizados
            await configuracionDB.establecerHorarios(horariosActuales);

            // Crear mensaje de confirmación
            let mensaje = '✅ Horarios eliminados correctamente:\n';
            mensaje += `📅 Días eliminados: ${diasAEliminar.join(', ')}\n\n`;
            
            // Mostrar horarios restantes
            if (Object.keys(horariosActuales).length > 0) {
                mensaje += 'Horarios actuales:\n';
                Object.entries(horariosActuales).forEach(([dia, horario]) => {
                    mensaje += `${dia}: ${horario.apertura} - ${horario.cierre}\n`;
                });
            } else {
                mensaje += 'No quedan horarios configurados.';
            }

            return send(mensaje);

        } catch (error) {
            console.error('Error al eliminar horarios:', error);
            return send('❌ Ocurrió un error al eliminar los horarios.');
        }
    }
};