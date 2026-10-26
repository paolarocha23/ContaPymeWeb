import mysql from 'mysql2/promise';

const candidatePasswords = ['', 'root', 'admin', '1234', '123456', 'Admin1234!', 'mysql', 'password'];

async function testConnection() {
  console.log('Probando conexión con MySQL Local (puerto 3306)...');
  for (const pwd of candidatePasswords) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pwd,
        connectTimeout: 2000
      });
      console.log(`¡CONEXION EXITOSA! Usuario: root, Password: "${pwd}"`);
      
      const [dbs] = await conn.query('SHOW DATABASES LIKE "contapyme"');
      console.log('Base de datos contapyme encontrada:', dbs.length > 0 ? 'SI' : 'NO');
      await conn.end();
      process.exit(0);
    } catch (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        // password incorrect, continue to next
        continue;
      } else {
        console.error('Error diferente de acceso:', err.message);
        break;
      }
    }
  }
  console.log('No se pudo autenticar con las contraseñas comunes automáticas.');
}

testConnection();
