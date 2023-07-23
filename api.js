const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();
var cors =require('cors');
const PORT = 8081;
const SECRET_KEY = 'clavesecretaariasmusic';
const { Pool } = require('pg');
require('dotenv').config();
let whiteList =['http://localhost:4202']
app.use(cors(whiteList));
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432, // Puerto predeterminado de PostgreSQL
});

app.use((req, res, next)=>{
    console.log('Peticion Realizada:',Date()); //informacion de cada peticicion a la API
    console.log('Ruta de peticion: ',req.originalUrl);
    console.log('Host: ',req.hostname);
    console.log(req.method);
    next();
  });
app.use(bodyParser.json());
// Middleware de autenticación
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
//  Ruta de inicio
app.get('/', (req, res) =>
{
  res.send('Ariastest API');
});
// Ruta para iniciar sesión y obtener un token JWT
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const { rows, rowCount } = await pool.query(query, [username]);
  
      if (rowCount === 0) return res.sendStatus(404);
  
      const user = rows[0];
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) return res.sendStatus(500);
        if (!result) return res.sendStatus(401);
  
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
        res.json({ token });
      });
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      res.sendStatus(500);
    }
  });

// CRUD: Obtener todos los usuarios
app.get('/api/users',authenticateToken, async (req, res) => {
  try {
    const query = 'select u.id, username, fullname "fullName", email, r."name" "rolename", r."id" roleid from users u, roles r where r.id =u.rol order by fullname desc';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.sendStatus(500);
  }
});

// CRUD: Obtener todos los roles
app.get('/api/roles',authenticateToken, async (req, res) => {
  try {
    const query = 'select t.id, t.name from roles t';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.sendStatus(500);
  }
});

// CRUD: Obtener un usuario por su ID
app.get('/users/:id',authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const { rows, rowCount } = await pool.query(query, [userId]);
    if (rowCount === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener usuario por ID:', err);
    res.sendStatus(500);
  }
});

// CRUD: Crear un nuevo usuario
app.post('/api/users', authenticateToken,async (req, res) => {
  const { username, fullName, email, password, roleid } = req.body;
  // Validación básica (puedes agregar más validaciones según tus necesidades)
  if (!roleid || !username || !fullName || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const query = 'INSERT INTO users (username, fullName, email, password, rol) VALUES ($1, $2, $3, $4, $5) RETURNING *';

  try {
    const { rows } = await pool.query(query, [username, fullName, email, hashedPassword, roleid]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.sendStatus(500);
  }
});

// CRUD: Actualizar un usuario existente
app.put('/api/users/:id',authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { username, fullName, email } = req.body;

  // Validación básica (puedes agregar más validaciones según tus necesidades)
  if (!username || !fullName || !email) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const query = 'UPDATE users SET username = $1, fullName = $2, email = $3 WHERE id = $4 RETURNING *';

  try {
    const { rows, rowCount } = await pool.query(query, [username, fullName, email, userId]);
    if (rowCount === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.sendStatus(500);
  }
});

// CRUD: Eliminar un usuario
app.delete('/api/users/:id', authenticateToken,async (req, res) => {
  const userId = parseInt(req.params.id);
  const query = 'DELETE FROM users WHERE id = $1';

  try {
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});