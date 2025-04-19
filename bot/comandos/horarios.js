module.exports = {
    name: 'horarios',
    description: 'Establece los horarios de atención del bot.',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) return send(
            'Usa: horarios | días | hora inicio | hora fin\n' +
            'Ejemplo: horarios | L,M,X,J,V | 09:00 | 18:00\n' +
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

        await configuracionDB.establecerHorarios(horaApertura, horaCierre, diasIngresados);
        return send(
            '✅ Horarios establecidos correctamente:\n' +
            `📅 Días: ${diasIngresados.join(',')}\n` +
            `⏰ Horario: ${horaApertura} - ${horaCierre}`
        );
    }
};