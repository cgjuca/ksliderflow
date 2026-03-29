const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o Banco de Dados (Cloud ou Docker local)
const pool = new Pool(
    process.env.DATABASE_URL
        ? { 
            connectionString: process.env.DATABASE_URL, 
            ssl: { rejectUnauthorized: false } // Supabase e Neon requerem SSL
          }
        : {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        }
);

// Rota para salvar o Teste de Perfil
app.post('/api/salvar-teste', async (req, res) => {
    const { nome, email, acao, insp, harm, clar, dominante, token } = req.body;
    
    if (!token) return res.status(400).send("Token de convite obrigatório.");

    try {
        await pool.query('BEGIN');
        
        // 1. Verifica token e acessos
        const conviteRes = await pool.query('SELECT id, limite_acessos, acessos_usados FROM convites_lider WHERE token = $1', [token]);
        if (conviteRes.rows.length === 0) throw new Error("Convite não encontrado.");
        
        const convite = conviteRes.rows[0];
        if (convite.acessos_usados >= convite.limite_acessos) {
            throw new Error("Limite de testes atingido para este link.");
        }

        // 2. Cria ou localiza o usuário
        const userRes = await pool.query(
            'INSERT INTO usuarios (nome, email, tipo) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET nome = $1 RETURNING id',
            [nome, email, 'LIDERADO']
        );
        const userId = userRes.rows[0].id;

        // 3. Salva o resultado do teste associando ao convite
        await pool.query(
            'INSERT INTO resultados_testes (usuario_id, pontos_acao, pontos_inspiracao, pontos_harmonia, pontos_clareza, perfil_dominante, convite_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, acao, insp, harm, clar, dominante, convite.id]
        );
        
        // 4. Marca o acesso como usado
        await pool.query('UPDATE convites_lider SET acessos_usados = acessos_usados + 1 WHERE id = $1', [convite.id]);

        await pool.query('COMMIT');
        res.status(201).json({ message: "Perfil Líder Flow salvo com sucesso!" });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        if (err.message.includes("Limite") || err.message.includes("não encontrado")) {
            return res.status(403).send(err.message);
        }
        res.status(500).send("Erro no servidor ao salvar teste.");
    }
});

// NOVA ROTA: Geração de Convite (Apenas Admin)
app.post('/api/gerar-convite', async (req, res) => {
    const { nome_lider, limite_acessos } = req.body;
    const crypto = require('crypto');
    const token = crypto.randomBytes(3).toString('hex').toUpperCase(); // Ex: A1B2C3

    try {
        const result = await pool.query(
            'INSERT INTO convites_lider (nome_lider, token, limite_acessos) VALUES ($1, $2, $3) RETURNING token, nome_lider, limite_acessos',
            [nome_lider, token, limite_acessos]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao gerar convite.");
    }
});

// NOVA ROTA: Validação de Convite (Antes de abrir o Teste)
app.get('/api/convite/:token', async (req, res) => {
    try {
        const result = await pool.query('SELECT nome_lider, limite_acessos, acessos_usados FROM convites_lider WHERE token = $1', [req.params.token]);
        if (result.rows.length === 0) return res.status(404).json({ erro: "Convite não existe." });
        
        const convite = result.rows[0];
        if (convite.acessos_usados >= convite.limite_acessos) {
            return res.status(403).json({ erro: "Este link já atingiu o limite máximo de testes." });
        }
        res.status(200).json(convite);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar convite.");
    }
});

// Rota para buscar as estatísticas gerais Globais (Painel Admin)
app.get('/api/resultados', async (req, res) => {
    try {
        const query = `
            SELECT u.nome, u.email, r.pontos_acao, r.pontos_inspiracao, r.pontos_harmonia, r.pontos_clareza, r.perfil_dominante, r.data_teste AS created_at, c.nome_lider
            FROM resultados_testes r
            JOIN usuarios u ON r.usuario_id = u.id
            LEFT JOIN convites_lider c ON r.convite_id = c.id
            ORDER BY r.data_teste DESC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar os resultados.");
    }
});

app.get('/api/convites', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM convites_lider ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar os convites.");
    }
});

// NOVA ROTA: Estatísticas exclusivas de um Líder (Painel Equipe)
app.get('/api/resultados/:token', async (req, res) => {
    try {
        const query = `
            SELECT u.nome, u.email, r.pontos_acao, r.pontos_inspiracao, r.pontos_harmonia, r.pontos_clareza, r.perfil_dominante, r.data_teste AS created_at, c.nome_lider
            FROM resultados_testes r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN convites_lider c ON r.convite_id = c.id
            WHERE c.token = $1
            ORDER BY r.data_teste DESC
        `;
        const result = await pool.query(query, [req.params.token]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar resultados da equipe.");
    }
});

// Inicialização Local ou via Serverless (Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Servidor Líder Flow rodando na porta ${PORT}`));
}

module.exports = app;