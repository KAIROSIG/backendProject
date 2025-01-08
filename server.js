const express = require('express');
const cors = require('cors');
const pool = require('./db');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT; // Render asignará dinámicamente el puerto
const jwt = require('jsonwebtoken');

require('dotenv').config();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: '*', // Permitir todas las solicitudes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
}));

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const enviarCorreoConQR = async (email, qrCodeBase64, nombre, apellido, asientoNumero) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Comprobante de compra de asiento',
    html: `
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Compra de Asiento - KAIORISG</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border: 3px solid #000000;
        }
        header {
            background-color: #FFC107;
            color: #333333;
            text-align: center;
            padding: 15px;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
            margin: 18px 20px 0 20px;
        }
        header h1 {
            margin: 0;
            font-size: 28px;
            font-family: 'Arial Black', Gadget, sans-serif;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        header p {
            margin: 10px 0 0;
            font-size: 22px;
            font-family: 'Georgia', serif;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        main {
            padding: 20px;
        }
        main p {
            font-size: 16px;
            color: #333333;
        }
        .qr-container {
            text-align: center;
            margin: 20px;
            background-color: #f0f0f0;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #000000;
        }
        .qr-container img {
            max-width: 200px;
            height: auto;
        }
        .details h2 {
            color: #333333;
            font-size: 20px;
            margin-top: 0;
        }
        footer {
            background-color: #000000;
            color: #ffffff;
            text-align: center;
            padding: 15px;
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
        }
        footer p {
            margin: 0;
            font-size: 14px;
        }
        footer a {
            color: #FFC107;
            text-decoration: none;
        }
        footer .social-links a {
            color: #FFC107;
            text-decoration: none;
            margin: 0 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>KAIROSIG</h1>
            <p>Compra Confirmada</p>
        </header>
        <main>
            <p>Estimado/a <strong>${nombre} ${apellido}</strong>,</p>
            <p>¡Gracias por tu compra! Aquí tienes tu código QR para el asiento.</p>
            <div class="qr-container">
                <img src="cid:qr_image" alt="Código QR">
            </div>
            <div class="details">
                <h2>Detalles de la Compra:</h2>
                <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
                <p><strong>Número de Asiento:</strong> ${asientoNumero}</p>
            </div>
        </main>
        <footer>
            <p>© 2025 KAIROSIG. Todos los derechos reservados.</p>
            <p>Si tienes alguna pregunta, contáctanos en <a href="mailto:proyectos.kairosig@gmail.com">proyectos.kairosig@gmail.com</a></p>
            <div class="social-links">
                <a href="https://www.facebook.com/kairosigformacionyproyectos/">Facebook</a>
                <a href="https://www.instagram.com/kairosig">Instagram</a>
                <a href="https://www.tiktok.com/@kairosig">TikTok </a>
                <a href="https://www.youtube.com/@kairosig">Youtube </a>
                <a href="https://kairosig.com">Pagina Web </a>
            </div>
        </footer>
    </div>
</body>
    `,
    attachments: [
      {
        filename: 'codigoQR.png',
        content: qrCodeBase64.split('base64,')[1], // Eliminamos el prefijo base64
        encoding: 'base64',
        cid: 'qr_image' // ID de la imagen que se hace referencia en el correo
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado con éxito:', info.response);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
};

// Obtener todos los precios
app.get('/api/prices', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM Precios');
    res.json(results);
  } catch (error) {
    console.error('Error al obtener los precios:', error);
    res.status(500).send('Error al obtener los precios.');
  }
});

// Obtener un precio por ID
app.get('/api/prices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await pool.query('SELECT * FROM Precios WHERE Id_Precios = ?', [id]);
    if (results.length === 0) {
      return res.status(404).send('Precio no encontrado.');
    }
    res.json(results[0]);
  } catch (error) {
    console.error(`Error al obtener el precio con ID ${id}:`, error);
    res.status(500).send('Error al obtener el precio.');
  }
});

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log("Token no proporcionado");
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Error al verificar el token:", err.message);
      return res.status(403).json({ message: 'Token inválido' });
    }
    console.log("Usuario autenticado:", user); // Log para depuración
    req.user = user; // Adjunta los datos del usuario al objeto de solicitud
    next();
  });
};

module.exports = verificarToken;

// Ruta para login con generación de JWT
app.post('/api/admin/login', async (req, res) => {
  const { email, contrasena } = req.body;
  try {
    const [result] = await pool.query(
      'SELECT * FROM Administrador WHERE email = ? AND contrasena = ?',
      [email, contrasena]
    );

    if (result.length > 0) {
      const admin = result[0];
      const token = jwt.sign({ id: admin.admin_id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ success: true, token, message: 'Inicio de sesión exitoso' });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error en el servidor');
  }
});

app.get('/api/asientos', async (req, res) => {
  try {
    const [result] = await pool.query(`
      SELECT 
        Asiento.*, 
        Cliente.nombre AS cliente_nombre, 
        Cliente.apellido AS cliente_apellido, 
        Cliente.cedula AS cliente_cedula, 
        Cliente.email AS cliente_email, 
        Compra.metodo_pago,
        Compra.imagen
      FROM Asiento
      LEFT JOIN Compra ON Asiento.asiento_id = Compra.asiento_id AND Compra.estado = TRUE
      LEFT JOIN Cliente ON Compra.cliente_id = Cliente.cliente_id
      ORDER BY CAST(asiento_numero AS UNSIGNED);
    `);

    res.json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error en el servidor');
  }
});

app.put('/api/asientos/:id/disponible',verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('UPDATE Compra SET estado = FALSE WHERE asiento_id = ?', [id]);

    const [result] = await pool.query(
      'UPDATE Asiento SET disponible = TRUE, codigo_qr = NULL, codigo_verificacion = NULL WHERE asiento_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Asiento no encontrado' });
    }

    // Obtener los datos actualizados del asiento
    const [updatedAsiento] = await pool.query('SELECT * FROM Asiento WHERE asiento_id = ?', [id]);

    res.json(updatedAsiento[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error en el servidor');
  }
});

const generarCodigoVerificacion = (asientoId) => {
  return `VER-${asientoId}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const generarQRCode = async (asientoId, cliente, codigoVerificacion) => {
  const qrText = cliente 
    ? `Asiento: ${asientoId}\nComprador: ${cliente.nombre} ${cliente.apellido}\nCédula: ${cliente.cedula}\nCódigo de verificación: ${codigoVerificacion}`
    : `Asiento: ${asientoId}\nDisponible`;

  const qrContent = `${qrText}\nUUID: ${asientoId}`;
  return QRCode.toDataURL(qrContent);
};

app.put('/api/asientos/:uuid', verificarToken, async (req, res) => {
  const { uuid } = req.params; // Mantén el UUID en la URL para buscar el asiento
  const { nombre, apellido, cedula, email, metodo_pago = "Deposito", imagen } = req.body;

  try {
    console.log("Datos recibidos:", req.body);

    // Buscar el asiento por UUID
    const [asientoResult] = await pool.query('SELECT * FROM Asiento WHERE asiento_id = ?', [uuid]);
    const asiento = asientoResult[0];

    if (!asiento) {
      return res.status(404).send('Asiento no encontrado');
    }

    if (!asiento.disponible) {
      return res.status(400).send('El asiento ya está ocupado. No se puede guardar cambios.');
    }

    const asientoNumero = asiento.asiento_numero; // Obtener el número de asiento

    // Verificar si ya existe una compra activa para este asiento
    const [compraExistente] = await pool.query('SELECT * FROM Compra WHERE asiento_id = ? AND estado = TRUE', [uuid]);
    if (compraExistente.length > 0) {
      return res.status(400).send('Ya existe una compra activa para este asiento.');
    }

    // Verificar si el cliente ya existe o crear uno nuevo
    let clienteId;
    const [clienteResult] = await pool.query('SELECT cliente_id FROM Cliente WHERE email = ?', [email]);

    if (clienteResult.length > 0) {
      clienteId = clienteResult[0].cliente_id;
    } else {
      const [newCliente] = await pool.query(
        'INSERT INTO Cliente (nombre, apellido, cedula, email) VALUES (?, ?, ?, ?)',
        [nombre, apellido, cedula, email]
      );
      clienteId = newCliente.insertId;
    }

    // Generar el código de verificación y el código QR con el número de asiento
    const codigoVerificacion = `VER-${asientoNumero}-${Math.floor(1000 + Math.random() * 9000)}`;
    const codigoQR = await QRCode.toDataURL(
      `Asiento: ${asientoNumero}\nComprador: ${nombre} ${apellido}\nCédula: ${cedula}\nCódigo de verificación: ${codigoVerificacion}`
    );

    // Actualizar el asiento
    await pool.query(
      'UPDATE Asiento SET disponible = FALSE, codigo_qr = ?, codigo_verificacion = ? WHERE asiento_id = ?',
      [codigoQR, codigoVerificacion, uuid]
    );

    // Registrar la compra en la tabla Compra
    const [compraResult] = await pool.query(
      `INSERT INTO Compra (cliente_id, asiento_id, admin_id, metodo_pago, monto, imagen, estado) 
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [clienteId, uuid, 1, metodo_pago, 100, imagen]
    );

    const compraId = compraResult.insertId;

    // Crear el comprobante en la tabla Comprobante
    await pool.query('INSERT INTO Comprobante (compra_id) VALUES (?)', [compraId]);

    //ENVIO DE CORREO
    await enviarCorreoConQR(email, codigoQR, nombre, apellido, asientoNumero);

    // Responder con los datos del asiento, usando asiento_numero
    res.json({
      asiento_numero: asientoNumero,
      codigo_qr: codigoQR,
      codigo_verificacion: codigoVerificacion,
      cliente_nombre: nombre,
      cliente_apellido: apellido,
      cliente_cedula: cedula,
      cliente_email: email,
      metodo_pago: metodo_pago,
      imagen: imagen
    });
  } catch (error) {
    console.error('Error al actualizar el asiento:', error.message);
    res.status(500).send('Error en el servidor');
  }
});

app.post('/api/hotmart/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hotmart-hottok'];

    if (signature !== process.env.HOTMART_KEY) {
      console.error('Firma inválida. La solicitud no es de Hotmart.');
      return res.status(401).send('No autorizado');
    }

    const { event, data } = req.body;

    if (event === 'PURCHASE_COMPLETE') {
      const asientoUUID = data.product.ucode;
      const { name, lastname, email, cedula } = data.buyer;
      const monto = data.purchase.price.value;
      let metodo_pago = data.purchase.payment.type;
      const transaction = data.purchase.transaction;

      if (['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER'].includes(metodo_pago)) {
        metodo_pago = 'Hotmart';
      }

      const [asientoResult] = await pool.query('SELECT * FROM Asiento WHERE asiento_id = ?', [asientoUUID]);
      const asiento = asientoResult[0];

      if (!asiento || !asiento.disponible) {
        return res.status(404).send('Asiento no disponible o no encontrado');
      }

      const asientoNumero = asiento.asiento_numero;
      const codigoVerificacion = generarCodigoVerificacion(asientoNumero);
      const codigoQR = await generarQRCode(asientoNumero, { nombre: name, apellido: lastname, cedula }, codigoVerificacion);

      await pool.query(
        'UPDATE Asiento SET disponible = FALSE, codigo_qr = ?, codigo_verificacion = ? WHERE asiento_id = ?',
        [codigoQR, codigoVerificacion, asientoUUID]
      );

      let clienteId;
      const [clienteResult] = await pool.query('SELECT cliente_id FROM Cliente WHERE email = ?', [email]);

      if (clienteResult.length === 0) {
        const [newCliente] = await pool.query(
          'INSERT INTO Cliente (nombre, apellido, cedula, email) VALUES (?, ?, ?, ?)',
          [name, lastname, cedula, email]
        );
        clienteId = newCliente.insertId;
      } else {
        clienteId = clienteResult[0].cliente_id;
      }

      await pool.query(
        'INSERT INTO Compra (cliente_id, asiento_id, admin_id, metodo_pago, monto, estado, transaction_id) VALUES (?, ?, ?, ?, ?, TRUE, ?)',
        [clienteId, asientoUUID, 1, metodo_pago, monto, transaction]
      );

      // Recuperar el ID de la última compra
      const [compraResult] = await pool.query('SELECT LAST_INSERT_ID() AS compra_id');
      const compraId = compraResult[0].compra_id;

      await pool.query(
        'INSERT INTO Comprobante (compra_id) VALUES (?)',
        [compraId]
      );

      await enviarCorreoConQR(email, codigoQR, name, lastname, asientoNumero);

      res.json({
        success: true,
        message: 'Compra registrada y asiento actualizado',
        asiento_numero: asientoNumero,
        cliente_email: email,
        codigo_verificacion: codigoVerificacion
      });
    } else {
      res.status(400).send('Evento no soportado');
    }
  } catch (error) {
    console.error('Error al procesar el webhook:', error.message);
    res.status(500).send('Error en el servidor');
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
