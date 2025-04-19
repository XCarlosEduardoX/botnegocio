// agregarVariosProductos.js
module.exports = {
    name: 'agregar varios',
    adminOnly: true,

    async execute({ args, send }) {
        const productos = args.split('\n');
        const resultados = [];

        for (const producto of productos) {
            const [nombre, precio] = producto.split(' ');
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