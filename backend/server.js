const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o banco de dados (Atenção: ajuste sua senha)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', 
    database: 'gestao_estoque',
    port: 3307
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado ao banco de dados MySQL!');
});

// --- ROTA DE LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    db.query('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email, senha], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) {
            res.json({ success: true, message: 'Login bem-sucedido' });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    });
});

// --- ROTAS DE PRODUTOS ---
app.get('/api/produtos', (req, res) => {
    db.query('SELECT * FROM produtos ORDER BY nome ASC', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/produtos', (req, res) => {
    const { nome, descricao, preco, quantidade, estoque_minimo } = req.body;
    const query = 'INSERT INTO produtos (nome, descricao, preco, quantidade, estoque_minimo) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [nome, descricao, preco, quantidade, estoque_minimo], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json({ id: results.insertId, ...req.body });
    });
});

app.put('/api/produtos/:id', (req, res) => {
    const { nome, descricao, preco, quantidade, estoque_minimo } = req.body;
    const query = 'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, quantidade = ?, estoque_minimo = ? WHERE id = ?';
    db.query(query, [nome, descricao, preco, quantidade, estoque_minimo, req.params.id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

app.delete('/api/produtos/:id', (req, res) => {
    db.query('DELETE FROM produtos WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// --- ROTAS DE MOVIMENTAÇÕES ---
app.get('/api/movimentacoes', (req, res) => {
    const query = `
        SELECT m.id, p.nome as produto_nome, m.tipo, m.quantidade, DATE_FORMAT(m.data, '%Y-%m-%d') as data
        FROM movimentacoes m
        JOIN produtos p ON m.produto_id = p.id
        ORDER BY m.data DESC, m.id DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/movimentacoes', (req, res) => {
    const { produto_id, tipo, quantidade, data } = req.body;
    
    // 1. Registra a movimentação no histórico
    const queryInsert = 'INSERT INTO movimentacoes (produto_id, tipo, quantidade, data) VALUES (?, ?, ?, ?)';
    db.query(queryInsert, [produto_id, tipo, quantidade, data], (err, results) => {
        if (err) return res.status(500).send(err);
        
        // 2. Atualiza o estoque na tabela de produtos
        const operador = tipo === 'Entrada' ? '+' : '-';
        const queryUpdate = `UPDATE produtos SET quantidade = quantidade ${operador} ? WHERE id = ?`;
        
        db.query(queryUpdate, [quantidade, produto_id], (errUpdate) => {
            if (errUpdate) return res.status(500).send(errUpdate);
            res.json({ success: true });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});