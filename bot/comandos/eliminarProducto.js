module.exports = {
    name: 'eliminar producto',
    adminOnly: true,
  
    async execute({ args, numeroNegocio, send }) {
      const nombre = args.trim();
      if (!nombre) return send('Usa: eliminar producto | nombre');
  
      const productosDB = require('../../firebase/productos');
      const eliminado = await productosDB.eliminarProducto({ nombre });
  
      if (eliminado) {
        return send(`🗑️ Producto "${nombre}" eliminado correctamente.`);
      } else {
        return send(`⚠️ No se encontró el producto "${nombre}".`);
      }
    }
  };
  