// Database/seedUser.js
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * Seeder pour la table users
 * Insère tous les types d'utilisateurs avec leurs rôles
 */
class SeedUser {
  
  /**
   * Liste des utilisateurs à insérer
   */
  getUsers() {
    return [
      {
        nom: 'Admin',
        prenom: 'Super',
        email: 'admin@hda.com',
        mot_de_passe: 'admin123',
        role: 'admin',
        statut: 'actif'
      },
      {
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.manager@hda.com',
        mot_de_passe: 'manager123',
        role: 'manager',
        statut: 'actif'
      },
      {
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.reception@hda.com',
        mot_de_passe: 'reception123',
        role: 'receptioniste',
        statut: 'actif'
      },
      {
        nom: 'Dubois',
        prenom: 'Philippe',
        email: 'philippe.caisse@hda.com',
        mot_de_passe: 'caisse123',
        role: 'caisse',
        statut: 'actif'
      },
      {
        nom: 'Lefevre',
        prenom: 'Nicolas',
        email: 'nicolas.water@hda.com',
        mot_de_passe: 'water123',
        role: 'water',
        statut: 'actif'
      },
      {
        nom: 'Rousseau',
        prenom: 'Claire',
        email: 'claire.housekeeping@hda.com',
        mot_de_passe: 'housekeeping123',
        role: 'housekeeping',
        statut: 'actif'
      }
    ];
  }

  /**
   * Hasher le mot de passe
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Exécuter le seeder
   */
  async run() {
    try {
      console.log('🚀 Début du seeder des utilisateurs...');

      const users = this.getUsers();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        // Vérifier si l'utilisateur existe déjà
        const [existing] = await pool.query(
          'SELECT id_admin FROM users WHERE email = ?',
          [user.email]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Utilisateur déjà existant: ${user.email} (ignoré)`);
          skippedCount++;
          continue;
        }

        // Hasher le mot de passe
        const hashedPassword = await this.hashPassword(user.mot_de_passe);

        // Insérer l'utilisateur
        await pool.query(
          `INSERT INTO users (nom, prenom, email, mot_de_passe, role, statut, date_creation) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [user.nom, user.prenom, user.email, hashedPassword, user.role, user.statut]
        );

        console.log(`✅ Utilisateur créé: ${user.email} (${user.role})`);
        insertedCount++;
      }

      console.log(`\n📊 Résumé du seeder:`);
      console.log(`   ✅ ${insertedCount} utilisateur(s) créé(s)`);
      console.log(`   ⏭️  ${skippedCount} utilisateur(s) déjà existant(s)`);
      console.log(`   📋 Total: ${users.length} utilisateur(s)`);
      
      console.log('\n✅ Seeder terminé avec succès !');

    } catch (error) {
      console.error('❌ Erreur lors du seeder:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer tous les utilisateurs
   */
  async truncate() {
    try {
      await pool.query('DELETE FROM users');
      console.log('🗑️  Tous les utilisateurs ont été supprimés');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error.message);
      throw error;
    }
  }

  /**
   * Réinitialiser et recréer les utilisateurs
   */
  async refresh() {
    await this.truncate();
    await this.run();
  }
}

// Exécuter le seeder si le fichier est appelé directement
if (require.main === module) {
  const seedUser = new SeedUser();
  seedUser.run()
    .then(() => {
      console.log('\n🎉 Seeder exécuté avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = SeedUser;