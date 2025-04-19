module.exports = {
    name: 'horarios',
    description: 'Establece los horarios de atención del bot.',
    adminOnly: true,

    async execute({ args, send }) {
        let horarios = args;
        if (!horarios) return send('Usa: horarios | hh:mm | hh:mm');
        horarios = horarios.trim().split('|').map(h => h.trim()).filter(h => h !== '');
        if (horarios.length !== 2) return send('Usa: horarios | hh:mm | hh:mm');
        const [horaApertura, horaCierre] = horarios;
        const configuracionDB = require('../../firebase/configuracion');

        await configuracionDB.establecerHorarios(horaApertura, horaCierre);
        return send('✅Horarios establecidos correctamente.');

    }
};
