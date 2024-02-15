const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Configuration de la base de données PostgreSQL with ssl and sslmode require
const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false,
    }
});

// Endpoint pour la création d'articles
app.post('/articles', async (req, res) => {
    try {
        const { title, description, content } = req.body;
        const date = new Date().toISOString();

        // Insertion de l'article dans la base de données
        const query = 'INSERT INTO articles (title, description, content, date) VALUES ($1, $2, $3, $4)';
        await pool.query(query, [title, description, content, date]);

        res.status(200).send("Article créé avec succès !");
    } catch (error) {
        console.error("Erreur lors de la création de l'article :", error);
        res.status(500).send("Une erreur est survenue lors de la création de l'article.");
    }
});

// Endpoint pour la lecture des listes d'articles
app.get('/articles', async (req, res) => {
    try {
        // Récupération des articles depuis la base de données
        const query = 'SELECT * FROM articles';
        const result = await pool.query(query);
        const articles = result.rows;

        res.status(200).json(articles);
    } catch (error) {
        console.error("Erreur lors de la récupération des articles :", error);
        res.status(500).send("Une erreur est survenue lors de la récupération des articles.");
    }
});

// Démarrage du serveur
app.listen(PORT, async () => {
    //create table if not exists
    const createTableQuery = `CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        content TEXT NOT NULL,
        date TIMESTAMP NOT NULL
    )`;

    await pool.query(createTableQuery);

    console.log(`Serveur démarré sur le port ${PORT}`);
});
