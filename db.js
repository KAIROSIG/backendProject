const mysql = require('mysql2/promise');
require('dotenv').config(); // Cargar las variables de entorno

// Configuración de la conexión a la base de datos con Promises
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER, // Usuario predeterminado en XAMPP
    password: process.env.DB_PASSWORD, // Contraseña vacía por defecto
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Puerto predeterminado
    waitForConnections: true, // Espera conexiones cuando el pool está lleno
    connectionLimit: 10, // Límite de conexiones simultáneas
    queueLimit: 0 // Sin límite en la cola de solicitudes
});

// Probar la conexión
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión exitosa a la base de datos');
        connection.release(); // Libera la conexión si es exitosa
    } catch (err) {
        console.error('Error de conexión:', err.message);
        console.error('Detalles del error:', err);
    }
}

testConnection();

// Exportar el pool para usar en otros módulos
module.exports = pool