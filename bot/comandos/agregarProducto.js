
module.exports = {
    name: 'agregar producto',
    adminOnly: true,

    async execute({ args, send }) {
        console.log(args);
        const [nombreRaw, precioRaw] = args.split('|').map(p => p.trim());
        if (!nombreRaw || !precioRaw) return send('Usa: agregar producto | nombre | precio');

        const precio = parseInt(precioRaw);
        if (isNaN(precio)) return send('El precio debe ser un número.');

        const productosDB = require('../../firebase/productos');
        await productosDB.agregarProducto({ nombre: nombreRaw, precio });

        return send(`✅ Producto "${nombreRaw}" agregado con precio de $${precio}.`);
    }
};
