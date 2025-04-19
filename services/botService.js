const fs = require('fs');
const path = require('path');

// Cargar comandos dinámicamente
function cargarComandos() {
    const comandos = {};
    const comandosPath = path.join(__dirname, '../bot/comandos');
    fs.readdirSync(comandosPath).forEach(file => {
        const comando = require(path.join(comandosPath, file));
        comandos[comando.name] = comando;
    });
    return comandos;
}

module.exports = { cargarComandos };
