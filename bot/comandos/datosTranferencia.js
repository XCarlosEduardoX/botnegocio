module.exports = {
    name: 'datostransferencia',
    description: 'Establece los datos bancarios para transferencias.',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args) return send(
            'Usa: datostransferencia | banco | número de cuenta | titular\n' +
            'Ejemplo: datostransferencia | Banco XYZ | 1234567890 | Juan Pérez'
        );

        const partes = args.split('|').map(p => p.trim());
        
        if (partes.length !== 3) {
            return send(
                '❌ Formato incorrecto. Usa:\n' +
                'datostransferencia | banco | número de cuenta | titular'
            );
        }

        const [banco, numeroCuenta, titular] = partes;

        // Validaciones básicas
        if (banco.length < 3) {
            return send('❌ El nombre del banco es demasiado corto');
        }

        if (numeroCuenta.length < 5) {
            return send('❌ El número de cuenta parece ser inválido');
        }

        if (titular.length < 3) {
            return send('❌ El nombre del titular es demasiado corto');
        }

        const datosTransferencia = {
            banco,
            numeroCuenta,
            titular
        };

        const configuracionDB = require('../../firebase/configuracion');
        
        try {
            // Necesitarías agregar este método en configuracion.js
            await configuracionDB.establecerDatosTransferencia(datosTransferencia);

            return send(
                '✅ Datos de transferencia establecidos correctamente:\n\n' +
                `🏦 Banco: ${banco}\n` +
                `📊 Cuenta: ${numeroCuenta}\n` +
                `👤 Titular: ${titular}`
            );
        } catch (error) {
            console.error('Error al establecer datos de transferencia:', error);
            return send('❌ Error al guardar los datos de transferencia');
        }
    }
};