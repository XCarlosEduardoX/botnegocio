module.exports = {
    name: 'listar productos',
    adminOnly: true,
  
    async execute({ numeroNegocio, send }) {
      const productosDB = require('../../firebase/productos');
      const productos = await productosDB.obtenerProductos();
  
      if (!productos.length) {
        return send('📦 No hay productos registrados.');
      }
  
      let mensaje = '📋 Productos:\n\n';
      productos.forEach((p, i) => {
        mensaje += `${i + 1}. ${p.nombre} - $${p.precio}\n`;
      });
  
      return send(mensaje);
    }
  };
  