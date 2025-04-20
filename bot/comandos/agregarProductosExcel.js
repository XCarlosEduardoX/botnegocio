module.exports = {
    name: 'agregar excel',
    adminOnly: true,

    async execute({ args, send, message, client }) {
        try {
            if (!message || !message.hasMedia) {
                return send('Por favor, adjunta un archivo Excel.');
            }

            const mediaMessage = await message.downloadMedia();
            if (!mediaMessage || !mediaMessage.data) {
                return send('Error al descargar el archivo.');
            }

            const buffer = Buffer.from(mediaMessage.data, 'base64');
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const productos = XLSX.utils.sheet_to_json(sheet);

            const resultados = [];
            const productosDB = require('../../firebase/productos');

            for (const producto of productos) {
                // Verificar todas las posibles variaciones de nombres de columnas
                const nombre = producto.nombre || producto.Nombre || producto.NOMBRE;
                const precio = producto.precio || producto.Precio || producto.PRECIO;
                
                // Validación más detallada
                if (!nombre) {
                    resultados.push(`❌ Error: Falta el nombre del producto en una fila`);
                    continue;
                }

                const precioNum = parseInt(precio);
                if (isNaN(precioNum)) {
                    resultados.push(`❌ Error: Precio inválido para "${nombre}"`);
                    continue;
                }

                try {
                    await productosDB.agregarProducto({
                        nombre,
                        precio: precioNum
                    });
                    resultados.push(`✅ ${nombre}: $${precioNum}`);
                } catch (error) {
                    resultados.push(`❌ Error al guardar "${nombre}": ${error.message}`);
                }
            }

            if (resultados.length === 0) {
                return send('No se encontraron productos para procesar en el Excel.');
            }

            return send('Resultados:\n' + resultados.join('\n'));

        } catch (error) {
            console.error('Error al procesar el Excel:', error);
            return send('❌ Ocurrió un error al procesar el archivo Excel. Asegúrate de que el formato sea correcto con columnas "nombre" y "precio".');
        }
    }
};