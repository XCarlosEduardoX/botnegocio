module.exports = {
    name: 'agregar varios',
    adminOnly: true,

    async execute({ args, send }) {
        const productos = args.split('\n');
        const resultados = [];

        for (const producto of productos) {
            // Tomar el último elemento como precio y el resto como nombre
            const partes = producto.split(' ');
            const precio = partes.pop();
            const nombre = partes.join(' ');
            const precioNum = parseInt(precio);

            if (nombre && !isNaN(precioNum)) {
                const productosDB = require('../../firebase/productos');
                await productosDB.agregarProducto({ nombre, precio: precioNum });
                resultados.push(`✅ ${nombre}: $${precioNum}`);
            } else {
                resultados.push(`❌ Error: ${producto}`);
            }
        }

        return send('Resultados:\n' + resultados.join('\n'));
    }
};