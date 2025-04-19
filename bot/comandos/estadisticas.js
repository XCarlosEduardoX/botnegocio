module.exports = {
    name: 'estadisticas',
    aliases: ['estadisticas', 'estadisticasdia', 'estadisticassemana'],
    description: 'Cantidad de pedidos del día/semana, productos más vendidos, ingresos aproximados (según pagos confirmados)',
    adminOnly: true,

    async execute({ args, send }) {
        if (!args || typeof args !== 'string') return send('Usa: estadisticas | dia/semana');
        args = args.trim().toLowerCase();
        if (!['dia', 'semana'].includes(args)) return send('Usa: estadisticas | dia/semana');

        const pedidosDB = require('../../firebase/pedidos');
        const pedidosCompletados = await pedidosDB.obtenerPedidosCompletados();

        if (!pedidosCompletados.length) return send('No hay pedidos completados.');

        const ahora = new Date();
        let desde, hasta;

        if (args === 'dia') {
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        } else {
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
        }

        hasta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);

        const pedidosFiltrados = pedidosCompletados.filter(p => {
            const fecha = new Date(p.fecha);
            return fecha >= desde && fecha < hasta;
        });

        if (!pedidosFiltrados.length) return send('No hay pedidos en el rango seleccionado.');

        let ingresosTotales = 0;
        const productosVendidos = {};
        let totalPedidos = pedidosFiltrados.length;

        pedidosFiltrados.forEach(p => {
            ingresosTotales += p.carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
            p.carrito.forEach(item => {
                productosVendidos[item.nombre] = (productosVendidos[item.nombre] || 0) + item.cantidad;
            });
        });

        // Ordenar productos más vendidos
        const topProductos = Object.entries(productosVendidos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([nombre, cantidad]) => `\n• ${nombre}: ${cantidad} unidades`)


        const titulo = args === 'dia' ? 'del día' : 'de la semana';

        return send(
            `📊 *Estadísticas ${titulo}:*\n\n` +
            `📦 Total de pedidos: *${totalPedidos}*\n` +
            `💰 Ingresos totales: *$${(ingresosTotales).toFixed(2)}* \n` +
            `🛍️ Productos más vendidos: ${topProductos}`
        );

    }
};
