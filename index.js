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
    const { nome, email, acao, insp, harm, clar, dominante } = req.body;

    try {
        // 1. Cria ou localiza o usuário
        const userRes = await pool.query(
            'INSERT INTO usuarios (nome, email, tipo) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET nome = $1 RETURNING id',
            [nome, email, 'LIDERADO']
        );
        const userId = userRes.rows[0].id;

        // 2. Salva o resultado do teste
        await pool.query(
            'INSERT INTO resultados_testes (usuario_id, pontos_acao, pontos_inspiracao, pontos_harmonia, pontos_clareza, perfil_dominante) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, acao, insp, harm, clar, dominante]
        );

        res.status(201).json({ message: "Perfil Líder Flow salvo com sucesso!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro no servidor ao salvar teste.");
    }
});

// Rota para buscar as estatísticas/resultados (Painel Admin)
app.get('/api/resultados', async (req, res) => {
    try {
        const query = `
            SELECT u.nome, u.email, r.pontos_acao, r.pontos_inspiracao, r.pontos_harmonia, r.pontos_clareza, r.perfil_dominante, r.data_teste AS created_at
            FROM resultados_testes r
            JOIN usuarios u ON r.usuario_id = u.id
            ORDER BY r.data_teste DESC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar os resultados.");
    }
});

// Inicialização Local ou via Serverless (Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Servidor Líder Flow rodando na porta ${PORT}`));
}

module.exports = app;