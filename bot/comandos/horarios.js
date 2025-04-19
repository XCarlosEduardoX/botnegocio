module.exports = {
    name: 'horarios',
    description: 'Establece los horarios de atención del bot.',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) return send(
            'Usa: horarios | días | hora inicio | hora fin\n' +
            'Ejemplo: horarios | L,M,X,J,V | 09:00 | 18:00\n' +
            'Para días específicos: horarios | S,D | 11:00 | 13:00\n' +
            'L=Lunes, M=Martes, X=Miércoles, J=Jueves, V=Viernes, S=Sábado, D=Domingo'
        );

        const partes = args.trim().split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (partes.length !== 3) return send(
            '❌ Formato incorrecto. Usa:\n' +
            'horarios | días | hora inicio | hora fin'
        );

        const [dias, horaApertura, horaCierre] = partes;

        // Validar formato de días
        const diasValidos = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const diasIngresados = dias.split(',').map(d => d.trim().toUpperCase());
        
        const diasInvalidos = diasIngresados.filter(d => !diasValidos.includes(d));
        if (diasInvalidos.length > 0) {
            return send(`❌ Días inválidos: ${diasInvalidos.join(', ')}`);
        }

        // Validar formato de hora (HH:mm)
        const validarHora = (hora) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora);
        if (!validarHora(horaApertura) || !validarHora(horaCierre)) {
            return send('❌ Formato de hora inválido. Use HH:mm (ejemplo: 09:00)');
        }

        const configuracionDB = require('../../firebase/configuracion');

        // Obtener horarios actuales antes de actualizar
        const horariosActuales = await configuracionDB.obtenerHorarios() || {};

        // Crear objeto con los nuevos horarios para los días especificados
        const nuevosHorarios = {};
        diasIngresados.forEach(dia => {
            nuevosHorarios[dia] = {
                apertura: horaApertura,
                cierre: horaCierre
            };
        });

        // Combinar horarios actuales con nuevos
        const horariosActualizados = {
            ...horariosActuales,
            ...nuevosHorarios
        };

        await configuracionDB.establecerHorarios(horariosActualizados);

        // Crear mensaje de confirmación
        let mensaje = '✅ Horarios establecidos correctamente:\n\n';
        diasIngresados.forEach(dia => {
            mensaje += `📅 ${dia}: ${horaApertura} - ${horaCierre}\n`;
        });

        return send(mensaje);
    }
};