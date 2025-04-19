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
        const productos = await productosDB.obtenerProductos();

        // Buscar si ya existe un producto con ese nombre
        const productoExistente = productos.find(p => p.nombre.toLowerCase() === nombreRaw.toLowerCase());

        if (productoExistente) {
            // Aumentar el stock en 1 (o puedes modificar esto para aceptar cantidad)
            await productosDB.actualizarProducto(productoExistente.id, {
                stock: (productoExistente.stock || 1) + 1
            });

            return send(`🔄 El producto "${nombreRaw}" ya existía. Se aumentó el stock a ${productoExistente.stock + 1}.`);
        } else {
            // Crear nuevo producto con stock inicial de 1
            await productosDB.agregarProducto({ nombre: nombreRaw, precio, stock: 1 });

            return send(`✅ Producto "${nombreRaw}" agregado con precio de $${precio}.`);
        }
    }
};
