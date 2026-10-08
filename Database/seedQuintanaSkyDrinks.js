// Database/seedQuintanaSkyDrinks.js
const { pool } = require('../config/db');

class SeedQuintanaSkyDrinks {
    async run() {
        try {
            console.log('🚀 Début du seeder des boissons Quintana Sky pour le Bar...');

            // Liste complète des boissons avec leurs catégories textuelles, prix, alcool et stock initial
            const items = [
                // =========================================================================
                // BIERES & SOFTS
                // =========================================================================
                // "alias" = anciens noms du même article (doublons des versions précédentes du seed) :
                // le seeder les renomme / fusionne pour ne garder qu'un seul article.
                { nom: 'THB PM 33cl', alias: ['THB (PM)', 'THB PM 33 cl'], ingredients: 'Bière blonde locale 33cl', prix: 8000, categorie: 'Bières & Softs', alcool: 1, stock: 50 },
                { nom: 'THB GM 65cl', alias: ['THB (GM)', 'THB GM 65 cl'], ingredients: 'Bière blonde locale 65cl', prix: 12000, categorie: 'Bières & Softs', alcool: 1, stock: 50 },
                { nom: 'Gold Blanche PM 33cl', alias: ['Gold Blanche (PM)', 'Gold Blanche 33 cl'], ingredients: 'Bière blanche 33cl', prix: 8000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },
                { nom: 'Gold Blanche (GM)', ingredients: 'Bière blanche grand format', prix: 12000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },
                { nom: 'Gold Blanche 50 cl', ingredients: 'Bière blanche 50cl', prix: 10000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },
                { nom: 'Gold Normale 50 cl', ingredients: 'Bière blonde 50cl', prix: 10000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },
                { nom: 'Gold Blonde (PM)', ingredients: 'Bière blonde', prix: 8000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },
                { nom: 'Gold Blonde (GM)', ingredients: 'Bière blonde grand format', prix: 12000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },
                { nom: 'Beaufort PM 33cl', alias: ['Beaufort (PM)', 'Beaufort 33 CL'], ingredients: 'Bière 33cl', prix: 10000, categorie: 'Bières & Softs', alcool: 1, stock: 25 },
                { nom: 'Beaufort (GM)', ingredients: 'Bière grand format', prix: 15000, categorie: 'Bières & Softs', alcool: 1, stock: 25 },
                { nom: 'BBA PM', ingredients: 'Bière Beaufort PM', prix: 10000, categorie: 'Bières & Softs', alcool: 1, stock: 25 },
                { nom: 'BBA GM 100 CL', ingredients: 'Bière Beaufort GM 100cl', prix: 20000, categorie: 'Bières & Softs', alcool: 1, stock: 25 },
                { nom: 'Heineken PM 33cl', alias: ['Heineken (PM)', 'Heineken 33 CL'], ingredients: 'Bière importée 33cl', prix: 16000, categorie: 'Bières & Softs', alcool: 1, stock: 20 },
                { nom: 'Heineken (GM)', ingredients: 'Bière importée grand format', prix: 22000, categorie: 'Bières & Softs', alcool: 1, stock: 20 },
                { nom: '1664 (bière blonde)', ingredients: 'Bière blonde', prix: 22000, categorie: 'Bières & Softs', alcool: 1, stock: 20 },
                { nom: 'Bière Importée (50cl)', ingredients: 'Bière importée 50cl', prix: 25000, categorie: 'Bières & Softs', alcool: 1, stock: 15 },
                { nom: 'Ranovisy 33 cl', ingredients: 'Boisson locale Ranovisy', prix: 6000, categorie: 'Bières & Softs', alcool: 1, stock: 30 },

                { nom: 'World Cola (PM)', ingredients: 'Boisson gazeuse', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Fanta (PM)', ingredients: 'Boisson gazeuse', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'World Cola (GM)', ingredients: 'Boisson gazeuse grand format', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Fanta (GM)', ingredients: 'Boisson gazeuse grand format', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Coca Cola PM 30cl', alias: ['Coca 30 cl', 'Coca Cola (PM)'], ingredients: 'Coca-Cola 30cl', prix: 8000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Coca Cola GM 100cl', alias: ['Coca GM 100 CL', 'Coca Cola (GM)'], ingredients: 'Coca-Cola 100cl', prix: 20000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Youzu (PM)', ingredients: 'Boisson fruitée', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Caprice (PM)', ingredients: 'Boisson fruitée', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Caprice Soda', ingredients: 'Boisson gazeuse fruitée', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Caprice Grenadine', ingredients: 'Boisson fruitée grenadine', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Youzu GM 100cl', alias: ['Youzu (GM)', 'Youzou 100cl'], ingredients: 'Boisson fruitée 100cl', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Caprice (GM)', ingredients: 'Boisson fruitée grand format', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Bonbon Anglais (PM)', ingredients: 'Sodas', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Bonbon Anglais (GM)', ingredients: 'Sodas grand format', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Schweppes (PM)', ingredients: 'Boisson énergisante / thé glacé', prix: 12000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Booster (PM)', ingredients: 'Boisson énergisante / thé glacé', prix: 12000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Booster Apple Mix', ingredients: 'Boisson énergisante Apple Mix', prix: 12000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Booster Tornado', ingredients: 'Boisson énergisante Tornado', prix: 12000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Ice Tea (PM)', ingredients: 'Boisson énergisante / thé glacé', prix: 12000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Schweppes (GM)', ingredients: 'Grand format', prix: 20000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Booster (GM)', ingredients: 'Grand format', prix: 20000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Ice Tea (GM)', ingredients: 'Grand format', prix: 20000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Redbull', ingredients: 'Boisson énergisante', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'XXL', ingredients: 'Boisson énergisante', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Tonic PM', ingredients: 'Eau tonique', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Tonic GM', ingredients: 'Eau tonique grand format', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Eau Vive PM 50cl', alias: ['Eau Vive (PM)', 'Eau Vive PM 50 cl'], ingredients: 'Eau plate 50cl', prix: 6000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Eau Vive GM 100cl', alias: ['Eau Vive GM 100 CL', 'Eau Vive (GM)'], ingredients: 'Eau plate 100cl', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 30 },
                { nom: 'Cristal PM 50cl', alias: ['Cristal (50cl)', 'Cristal PM 50 CL'], ingredients: 'Eau plate 50cl', prix: 8000, categorie: 'Bières & Softs', alcool: 0, stock: 50 },
                { nom: 'Cristal (1.5L)', ingredients: 'Eau plate 1.5L', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 50 },
                { nom: 'Sprite (PM)', ingredients: 'Sodas', prix: 8000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Sprite (GM)', ingredients: 'Sodas grand format', prix: 20000, categorie: 'Bières & Softs', alcool: 0, stock: 40 },
                { nom: 'Jus Naturel (PM)', ingredients: 'Jus de fruit frais', prix: 8000, categorie: 'Bières & Softs', alcool: 0, stock: 25 },
                { nom: 'Jus Naturel (GM)', ingredients: 'Jus de fruit frais grand format', prix: 20000, categorie: 'Bières & Softs', alcool: 0, stock: 25 },
                { nom: 'Sirop de Fraise', ingredients: 'Sirop', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 20 },
                { nom: 'Sirop de Grenadine', ingredients: 'Sirop', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 20 },
                { nom: 'Sirop de Menthe', ingredients: 'Sirop', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 20 },
                { nom: 'Sucre de Canne 1 L', ingredients: 'Sucre de canne liquide', prix: 15000, categorie: 'Bières & Softs', alcool: 0, stock: 20 },

                // =========================================================================
                // VIN / ALCOOLS FORTS (Vente au verre / cl)
                // =========================================================================
                { nom: 'Rhum Arrangé (10cl)', ingredients: 'Rhum macéré', prix: 15000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Vin (10cl)', ingredients: 'Alcool / Apéritif', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Campari (10cl)', ingredients: 'Alcool / Apéritif', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Aperol (10cl)', ingredients: 'Alcool / Apéritif', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Martini Rouge (5cl)', ingredients: 'Vermouth', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Martini Blanc (5cl)', ingredients: 'Vermouth', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Pastis (5cl)', ingredients: 'Alcool fort', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'PASTIS de Marseille Duval 45% 100Cl', ingredients: 'Pastis alcool fort', prix: 300000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 15 },
                { nom: 'Gin (5cl)', ingredients: 'Alcool fort', prix: 20000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'J&B (5cl)', ingredients: 'Whisky / Liqueur', prix: 25000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Red Label (5cl)', ingredients: 'Whisky / Liqueur', prix: 25000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Bailey\'s (5cl)', ingredients: 'Whisky / Liqueur', prix: 25000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Black Label (5cl)', ingredients: 'Whisky supérieur', prix: 35000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Jack Daniel\'s (5cl)', ingredients: 'Whisky supérieur', prix: 35000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Chivas (5cl)', ingredients: 'Whisky supérieur', prix: 35000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Dewar\'s (5cl)', ingredients: 'Whisky supérieur', prix: 35000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Double Black (5cl)', ingredients: 'Whisky', prix: 45000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 20 },
                { nom: 'Gold Label (5cl)', ingredients: 'Whisky de prestige', prix: 50000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 20 },
                { nom: 'Platinum (5cl)', ingredients: 'Whisky rare', prix: 65000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 15 },
                { nom: 'Macallan (5cl)', ingredients: 'Whisky rare', prix: 65000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 15 },
                { nom: 'Petit Vin 18,7 CL (Blanc)', ingredients: 'Vin individuel blanc 18.7cl', prix: 10000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Petit Vin 18,7 CL (Rouge)', ingredients: 'Vin individuel rouge 18.7cl', prix: 10000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 30 },
                { nom: 'Cubi Blanc', ingredients: 'Vin en cubi blanc', prix: 90000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 10 },
                { nom: 'Cubi Rouge', ingredients: 'Vin en cubi rouge', prix: 90000, categorie: 'Vin & Alcools Forts', alcool: 1, stock: 10 },

                // =========================================================================
                // VINS - BOUTEILLE (Existant)
                // =========================================================================
                { nom: 'Satyricon', ingredients: 'Vin bouteille', prix: 60000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Cuvee de l\'Aubade (Cote de Provence 2015)', ingredients: 'Vin rosé', prix: 75000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Touraine Pinot Noir', ingredients: 'Vin rouge', prix: 70000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Gabardes (Ch. Auzias 2009)', ingredients: 'Vin rouge', prix: 70000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Les Foncanelles', ingredients: 'Vin', prix: 60000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Moulins de Citran (Haut Medoc 2017)', ingredients: 'Vin rouge haut medoc', prix: 95000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'Ch. Letaillanet (Medoc 2012)', ingredients: 'Vin rouge medoc', prix: 90000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'La Vierge Pinot Noir (2011)', ingredients: 'Vin rouge', prix: 85000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'Cardinalices (Cote du Rhone 2005)', ingredients: 'Vin cote du rhone', prix: 85000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'Lazo Cabernet Sauvignon (2016)', ingredients: 'Vin cabernet sauvignon', prix: 80000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Ch St Clotilde (2010)', ingredients: 'Vin rouge', prix: 80000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Versus Red', ingredients: 'Vin rouge', prix: 75000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Domaine Auzias (2011)', ingredients: 'Vin', prix: 70000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Sunninghill', ingredients: 'Vin', prix: 70000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Lazo Chardonnay', ingredients: 'Vin blanc chardonnay', prix: 80000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Gewueztraminer (Vin d\'Alsace 2016)', ingredients: 'Vin d\'alsace', prix: 95000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'Bourgogne (Louis Jadot)', ingredients: 'Vin de bourgogne', prix: 110000, categorie: 'Vins - Bouteille', alcool: 1, stock: 6 },
                { nom: 'Loupiac (Dom. Bois de Roche 2014)', ingredients: 'Vin blanc moelleux', prix: 85000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'Rieseling (2016)', ingredients: 'Vin riesling', prix: 85000, categorie: 'Vins - Bouteille', alcool: 1, stock: 8 },
                { nom: 'Croix St Salvy (Gaillac 2017)', ingredients: 'Vin de gaillac', prix: 75000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Protea Rose', ingredients: 'Vin rosé', prix: 80000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },
                { nom: 'Medaillon Rose', ingredients: 'Vin rosé', prix: 75000, categorie: 'Vins - Bouteille', alcool: 1, stock: 10 },

                // =========================================================================
                // NOUVEAUX VINS : VINS ROUGES
                // =========================================================================
                { nom: 'Vin de France (Vieux Papes Rouge)', ingredients: 'Vieux Papes', prix: 70000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Vallée de la Loire, Saumur-Champigny (Maison Plessis-Duval)', ingredients: 'Maison Plessis-Duval', prix: 170000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Alsace Pinot Noir (Maison DRESCHLER)', ingredients: 'Maison DRESCHLER, Pinot Noir', prix: 180000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Languedoc-Roussillon, IGP Pays d\'Hérault (Moulin de Gassac Rouge)', ingredients: 'SAS Moulin de Gassac, Grenache-Syrah', prix: 130000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Cercle des Epicuriens Rouge)', ingredients: 'Cercle des Epicuriens', prix: 70000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Baron de Lestac Rouge)', ingredients: 'Baron de Lestac', prix: 120000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Maison CASTEL Merlot Rouge)', ingredients: 'Maison CASTEL, Bordeaux Merlot', prix: 130000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Bordeaux Supérieur (Chateau du Lort)', ingredients: 'Chateau du Lort', prix: 150000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Médoc (Maison CASTEL Rouge)', ingredients: 'Maison CASTEL, Médoc', prix: 150000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Cru de la Maqueline Rouge)', ingredients: 'Cru de la Maqueline', prix: 160000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Saint-Emilion (Maison CASTEL)', ingredients: 'Maison CASTEL, Saint-Emilion', prix: 170000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, 1ères Cotes de Bordeaux (Chateau Campet)', ingredients: 'Chateau Campet', prix: 210000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'France, Médoc (Château Tartuguière)', ingredients: 'Château Tartuguière', prix: 200000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Côtes de Bourg (Chateau du Bousquet)', ingredients: 'Chateau du Bousquet', prix: 240000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Clarendelle Clarence Dillon Rouge)', ingredients: 'Clarence Dillon Wines SAS, Clarendelle', prix: 280000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Haut-Médoc (Chateau d\'Arcins)', ingredients: 'Chateau d\'Arcins', prix: 310000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Graves (Château FERRANDE)', ingredients: 'Château FERRANDE', prix: 400000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Médoc (Clarendelle Clarence Dillon Rouge)', ingredients: 'Clarence Dillon Wines SAS, Clarendelle', prix: 360000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Haut-Médoc (Chateau Peyrat-Fourthon)', ingredients: 'Chateau Peyrat-Fourthon', prix: 370000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Médoc (Tour Prignac Grande Réserve)', ingredients: 'Tour Prignac, Grande Réserve', prix: 450000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Saint-Emilion Grand Cru (Chateau La Croix Montlabert)', ingredients: 'Chateau La Croix Montlabert, Saint Emilion Grand Cru', prix: 460000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Saint-Emilion Grand Cru (Chateau Montlabert)', ingredients: 'Chateau Montlabert, Saint Emilion Grand Cru', prix: 620000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Vallée du Rhône, AOP Côtes du Rhône (Maison JEANTET)', ingredients: 'Maison JEANTET, Côtes du Rhône', prix: 110000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Vallée du Rhône, AOP Côtes du Rhône (Maison CASTEL Syrah-Grenache)', ingredients: 'Maison CASTEL, Syrah-Grenache', prix: 120000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Vallée du Rhône, AOP Chateauneuf du Pape (Maison JEANTET)', ingredients: 'Maison JEANTET, Châteauneuf du Pape', prix: 600000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Vallée du Rhône, AOP Chateauneuf du Pape (Maison CASTEL)', ingredients: 'Maison CASTEL, Châteauneuf du Pape', prix: 630000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Provence, Bandol (Château Canadel)', ingredients: 'Château Canadel', prix: 440000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Espagne, Rioja (Marques de Murrieta)', ingredients: 'Domaine Igay, Marques de Murrieta', prix: 300000, categorie: 'Vins rouges', alcool: 1, stock: 10 },
                { nom: 'Bordeaux, Haut-Médoc (Chateau d\'Arcins Magnum)', ingredients: 'Chateau d\'Arcins (Magnum)', prix: 670000, categorie: 'Vins rouges', alcool: 1, stock: 10 },

                // =========================================================================
                // NOUVEAUX VINS : VINS BLANCS
                // =========================================================================
                { nom: 'Vin de France (Vieux Papes Chardonnay-Colombard)', ingredients: 'Vieux Papes Chardonnay-Colombard', prix: 80000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Vin de France (Maison CASTEL Chardonnay)', ingredients: 'Maison CASTEL, Chardonnay', prix: 100000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Vallée de la Loire, Muscadet Sèvre-et-Maine (Maison CASTEL)', ingredients: 'Maison CASTEL', prix: 130000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Vallée de la Loire, Touraine (Maison Plessis-Duval)', ingredients: 'Maison Plessis-Duval', prix: 140000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Maison CASTEL Sauvignon Blanc)', ingredients: 'Maison CASTEL, Bordeaux Sauvignon Blanc', prix: 150000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Bordeaux (Clarendelle Clarence Dillon Blanc)', ingredients: 'Clarence Dillon Wines SAS, Clarendelle', prix: 290000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Sud-Ouest, IGP Côtes de Gascogne (Maison CASTEL)', ingredients: 'Maison CASTEL Sauvignon Blanc', prix: 110000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Languedoc-Roussillon, IGP Pays d\'Oc (La Roche Mazet Chardonnay)', ingredients: 'La Roche Mazet, Chardonnay Blanc', prix: 100000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Languedoc-Roussillon, IGP Pays d\'Hérault (Moulin de Gassac Blanc)', ingredients: 'SAS Moulin de Gassac, Grenache Blanc-Colombard-Rolle', prix: 130000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Languedoc-Roussillon, IGP Pays d\'Oc (Maison CASTEL Muscat)', ingredients: 'Maison CASTEL, Muscat Semi-Sweet', prix: 140000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Bourgogne, Chablis (Maison CASTEL)', ingredients: 'Maison CASTEL', prix: 440000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Alsace Riesling (Maison DRESCHLER)', ingredients: 'Maison DRESCHLER, Riesling', prix: 180000, categorie: 'Vins blancs', alcool: 1, stock: 10 },
                { nom: 'Alsace Gewurztraminer (Maison DRESCHLER)', ingredients: 'Maison DRESCHLER, Gewurztraminer', prix: 220000, categorie: 'Vins blancs', alcool: 1, stock: 10 },

                // =========================================================================
                // NOUVEAUX VINS : VINS ROSES
                // =========================================================================
                { nom: 'Vallée de la Loire, AOP Cabernet d\'Anjou (Maison Plessis-Duval)', ingredients: 'Maison Plessis-Duval', prix: 130000, categorie: 'Vins roses', alcool: 1, stock: 10 },
                { nom: 'Côtes de Provence, AOP Côtes de Provence (Maison CASTEL)', ingredients: 'Maison CASTEL', prix: 180000, categorie: 'Vins roses', alcool: 1, stock: 10 },
                { nom: 'Côtes de Provence, AOP Côtes de Provence (Maison CAVALIER Marafiance)', ingredients: 'Maison CAVALIER, Marafiance', prix: 310000, categorie: 'Vins roses', alcool: 1, stock: 10 },
                { nom: 'Languedoc-Roussillon, IGP Pays d\'Hérault (Moulin de Gassac Rosé)', ingredients: 'SAS Moulin de Gassac, Grenache-Carignan-Cinsault', prix: 130000, categorie: 'Vins roses', alcool: 1, stock: 10 },

                // =========================================================================
                // NOUVEAUX VINS : VINS EFFERVESCENTS
                // =========================================================================
                { nom: 'Languedoc-Roussillon, Vin Pétillant (Folie by Gassac)', ingredients: 'SAS Moulin de Gassac, Folie by Gassac', prix: 210000, categorie: 'Vins effervescents', alcool: 1, stock: 10 },
                { nom: 'Vin de France, Mousseux 1/2 Sec (Maison CASTEL ICE Blanc)', ingredients: 'Maison CASTEL, ICE Blanc', prix: 200000, categorie: 'Vins effervescents', alcool: 1, stock: 10 },
                { nom: 'Vin de France, Mousseux 1/2 Sec (Maison CASTEL ICE Rosé)', ingredients: 'Maison CASTEL, ICE Rosé', prix: 190000, categorie: 'Vins effervescents', alcool: 1, stock: 10 },

                // =========================================================================
                // NOUVEAUX VINS : BAGS IN BOX
                // =========================================================================
                { nom: 'Afrique du Sud (L\'Incontournable Blanc 5L)', ingredients: 'L\'Incontournable Blanc (Format 5L)', prix: 170000, categorie: 'Bags in Box', alcool: 1, stock: 5 },
                { nom: 'Afrique du Sud (L\'Incontournable Rouge 5L)', ingredients: 'L\'Incontournable Rouge (Format 5L)', prix: 190000, categorie: 'Bags in Box', alcool: 1, stock: 5 },
                // =========================================================================
                // CHAMPAGNE / VIN MOUSSEUX
                // =========================================================================
                { nom: 'Cuvee Brut (Laurent Perrier)', ingredients: 'Champagne brut', prix: 350000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 5 },
                { nom: 'Delahaie', ingredients: 'Champagne', prix: 280000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 6 },
                { nom: 'Lanson Brut', ingredients: 'Champagne lanson brut', prix: 320000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 5 },
                { nom: 'Chapagne TD', ingredients: 'Champagne', prix: 250000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 6 },
                { nom: 'Rose Berteletti', ingredients: 'Vin mousseux rosé', prix: 90000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 10 },
                { nom: 'Les Dieux Chardonai', ingredients: 'Vin mousseux chardonnay', prix: 85000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 10 },
                { nom: 'Maguis Robitailles', ingredients: 'Vin mousseux', prix: 85000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 10 },
                { nom: 'Platinium Label', ingredients: 'Vin mousseux scintillant', prix: 100000, categorie: 'Champagne / Vin Mousseux', alcool: 1, stock: 10 },

                // =========================================================================
                // COCKTAILS (sous-catégories de la carte : "Avec alcool" / "Sans alcool")
                // =========================================================================
                // --- Avec alcool ---
                { nom: 'Spritz Aperol', ingredients: 'Cocktail pétillant', prix: 30000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 40 },
                { nom: 'Spritz Campari', ingredients: 'Cocktail pétillant', prix: 30000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 40 },
                { nom: 'Spritz Bucks Fizz', ingredients: 'Cocktail pétillant', prix: 30000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 40 },
                { nom: 'Spritz Limoncello', ingredients: 'Cocktail pétillant', prix: 30000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 40 },
                { nom: 'Margarita', ingredients: 'Cocktail standard avec alcool', prix: 20000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 50 },
                { nom: 'Mojito', ingredients: 'Cocktail standard avec alcool', prix: 20000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 50 },
                { nom: 'Piña Colada', ingredients: 'Cocktail standard avec alcool', prix: 20000, categorie: 'Cocktails > Avec alcool', alcool: 1, stock: 50 },
                // --- Sans alcool ---
                { nom: 'Pink Panther', ingredients: 'Mocktail sans alcool', prix: 15000, categorie: 'Cocktails > Sans alcool', alcool: 0, stock: 50 },
                { nom: 'Bora Bora', ingredients: 'Mocktail sans alcool', prix: 15000, categorie: 'Cocktails > Sans alcool', alcool: 0, stock: 50 },
                { nom: 'Mojito Sans Alcool', ingredients: 'Mocktail sans alcool', prix: 15000, categorie: 'Cocktails > Sans alcool', alcool: 0, stock: 50 },

                // =========================================================================
                // RHUM - TEQUILA - VODKA (Bouteilles)
                // =========================================================================
                { nom: 'Tequila Victoria', ingredients: 'Tequila', prix: 90000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Vodka Locale', ingredients: 'Vodka', prix: 100000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Vodka Priskaia', ingredients: 'Vodka', prix: 100000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Cazanove 1L', alias: ['Casanove', 'Cazanove 1 L'], ingredients: 'Alcool fort 1L', prix: 100000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Mangustan', ingredients: 'Alcool fort', prix: 100000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Tequila Municion 70 CL', ingredients: 'Tequila 70cl', prix: 300000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 8 },
                { nom: 'Cuvee Blanche Dzama', ingredients: 'Rhum blanc Dzama', prix: 120000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Dzama Cuvee Prestige', ingredients: 'Rhum ambré Prestige', prix: 150000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Dzama Cuvee Noir', ingredients: 'Rhum noir Dzama', prix: 140000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Rhum Arrangé (Bouteille)', ingredients: 'Bouteille de rhum arrangé', prix: 120000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 15 },
                { nom: 'Don Pedro', ingredients: 'Alcool fort', prix: 120000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 10 },
                { nom: 'Vodka Zubrowka', ingredients: 'Vodka polonaise', prix: 300000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 8 },
                { nom: 'Vodka Absolut (Bouteille)', ingredients: 'Vodka premium', prix: 400000, categorie: 'Rhum, Tequila & Vodka', alcool: 1, stock: 8 },

                // =========================================================================
                // SPIRITUEUX
                // =========================================================================
                { nom: 'Martini Rouge (Bouteille)', ingredients: 'Bouteille vermouth', prix: 375000, categorie: 'Spiritueux', alcool: 1, stock: 10 },
                { nom: 'Martini Blanc (Bouteille)', ingredients: 'Bouteille vermouth', prix: 375000, categorie: 'Spiritueux', alcool: 1, stock: 10 },
                { nom: 'Bailey\'s (Bouteille)', ingredients: 'Liqueur de crème', prix: 400000, categorie: 'Spiritueux', alcool: 1, stock: 10 },
                { nom: 'Jagermeister', ingredients: 'Liqueur aux herbes', prix: 550000, categorie: 'Spiritueux', alcool: 1, stock: 10 },
                { nom: 'Absolut Vodka Bleu', alias: ['Vodka Absolut'], ingredients: 'Vodka Absolut Bleue', prix: 400000, categorie: 'Spiritueux', alcool: 1, stock: 10 },
                { nom: 'Absolut Vodka Citron', ingredients: 'Vodka Absolut Citron', prix: 400000, categorie: 'Spiritueux', alcool: 1, stock: 10 },
                { nom: 'Luxardo Bitter', ingredients: 'Bitter Luxardo', prix: 350000, categorie: 'Spiritueux', alcool: 1, stock: 8 },
                { nom: 'Ciroc', ingredients: 'Vodka Ciroc', prix: 550000, categorie: 'Spiritueux', alcool: 1, stock: 8 },
                { nom: 'Drambuie', ingredients: 'Liqueur Drambuie', prix: 450000, categorie: 'Spiritueux', alcool: 1, stock: 8 },

                // =========================================================================
                // WHISKY
                // =========================================================================
                { nom: 'John Peters (70cl)', ingredients: 'Whisky 70cl', prix: 160000, categorie: 'Whisky', alcool: 1, stock: 12 },
                { nom: 'Clan Campbell (70cl)', ingredients: 'Whisky écossais', prix: 300000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'J&B (70cl)', ingredients: 'Whisky 70cl', prix: 300000, categorie: 'Whisky', alcool: 1, stock: 12 },
                { nom: 'J&B (1L)', ingredients: 'Whisky 1L', prix: 400000, categorie: 'Whisky', alcool: 1, stock: 12 },
                { nom: 'Grants (1L)', ingredients: 'Whisky 1L', prix: 400000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Red Label (70cl)', ingredients: 'Whisky Red Label 70cl', prix: 400000, categorie: 'Whisky', alcool: 1, stock: 12 },
                { nom: 'Red Label (1L)', ingredients: 'Whisky 1L', prix: 400000, categorie: 'Whisky', alcool: 1, stock: 12 },
                { nom: 'Ballantine\'s (1L)', ingredients: 'Whisky 1L', prix: 400000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Black Label (70cl)', ingredients: 'Whisky Black Label 70cl', prix: 580000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Black Label (1L)', ingredients: 'Whisky 1L', prix: 580000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Jack Daniel\'s (1L)', ingredients: 'Whisky Tennessee 1L', prix: 580000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Chivas Regal (70cl)', ingredients: 'Whisky 70cl', prix: 550000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Chivas Regal (1L)', ingredients: 'Whisky 1L', prix: 630000, categorie: 'Whisky', alcool: 1, stock: 10 },
                { nom: 'Double Black', ingredients: 'Whisky premium', prix: 680000, categorie: 'Whisky', alcool: 1, stock: 8 },
                { nom: 'Gold Label (1L)', ingredients: 'Whisky de luxe 1L', prix: 850000, categorie: 'Whisky', alcool: 1, stock: 6 },
                { nom: 'Platinium', ingredients: 'Whisky platinium', prix: 1200000, categorie: 'Whisky', alcool: 1, stock: 5 },
                { nom: 'Fuji', ingredients: 'Whisky japonais', prix: 950000, categorie: 'Whisky', alcool: 1, stock: 5 },
                { nom: 'Toki', ingredients: 'Whisky japonais', prix: 1200000, categorie: 'Whisky', alcool: 1, stock: 5 },
                { nom: 'Yoshi', ingredients: 'Whisky japonais', prix: 1200000, categorie: 'Whisky', alcool: 1, stock: 5 },
                { nom: 'Nikka', ingredients: 'Whisky japonais', prix: 1200000, categorie: 'Whisky', alcool: 1, stock: 5 },

                // =========================================================================
                // GIN
                // =========================================================================
                { nom: 'Gordon\'s (Bouteille)', ingredients: 'Gin Gordon\'s', prix: 400000, categorie: 'Gin', alcool: 1, stock: 10 },
                { nom: 'Bombay Sapphire (Bouteille)', ingredients: 'Gin Bombay Sapphire', prix: 530000, categorie: 'Gin', alcool: 1, stock: 10 },
                { nom: 'Tanqueray', ingredients: 'Gin Tanqueray', prix: 480000, categorie: 'Gin', alcool: 1, stock: 10 },

                // =========================================================================
                // SHOOTERS
                // =========================================================================
                { nom: 'Desire', ingredients: 'Shot', prix: 15000, categorie: 'Shooters', alcool: 1, stock: 30 },
                { nom: 'Kamikaze', ingredients: 'Shot', prix: 15000, categorie: 'Shooters', alcool: 1, stock: 30 },
                { nom: 'Lemon Drop', ingredients: 'Shot', prix: 15000, categorie: 'Shooters', alcool: 1, stock: 30 },
                { nom: 'Monkey Brain', ingredients: 'Shot', prix: 15000, categorie: 'Shooters', alcool: 1, stock: 30 },
                { nom: 'Vodka Rainbow', ingredients: 'Shot multicolore', prix: 25000, categorie: 'Shooters', alcool: 1, stock: 20 },
                { nom: 'Tequila Slammer\'s', ingredients: 'Shot tequila', prix: 25000, categorie: 'Shooters', alcool: 1, stock: 20 },

                // =========================================================================
                // VINS BLANCS ITALIENS
                // =========================================================================
                { nom: 'CHARDONNAY Fruili Zonin 13% 2023 75cl', ingredients: 'Vin blanc italien Chardonnay', prix: 180000, categorie: 'Vins Blancs Italiens', alcool: 1, stock: 20 },
                { nom: 'PINOT GRIGIO FRUILI Zonin 12% 2023 75cl', ingredients: 'Vin blanc italien Pinot Grigio', prix: 180000, categorie: 'Vins Blancs Italiens', alcool: 1, stock: 20 },
                { nom: 'SOAVE CLASSICO Zonin 12.5% 75cl', ingredients: 'Vin blanc italien Soave', prix: 180000, categorie: 'Vins Blancs Italiens', alcool: 1, stock: 20 },

                // =========================================================================
                // VINS ROUGES ITALIENS
                // =========================================================================
                { nom: 'MONTEPULCIANO D\'ABRUZZO Zonin 13.5% 2022 75cl', ingredients: 'Vin rouge italien Montepulciano', prix: 180000, categorie: 'Vins Rouges Italiens', alcool: 1, stock: 20 },
                { nom: 'CHIANTI Zonin 12.5% 75cl', ingredients: 'Vin rouge italien Chianti', prix: 210000, categorie: 'Vins Rouges Italiens', alcool: 1, stock: 20 },
                { nom: 'VALPOLICELLA CLASSICO Zonin 12.5% 75cl', ingredients: 'Vin rouge italien Valpolicella', prix: 210000, categorie: 'Vins Rouges Italiens', alcool: 1, stock: 20 },
                { nom: 'MONTEPULCIANO d\'Abruzzo Malandrino Cataldi Madonna 12% 2022 75cl', ingredients: 'Vin rouge italien Montepulciano premium', prix: 300000, categorie: 'Vins Rouges Italiens', alcool: 1, stock: 15 },
                { nom: 'VALPOLICELLA Classico Salvaterra 13% 2021 75cl', ingredients: 'Vin rouge italien Valpolicella premium', prix: 320000, categorie: 'Vins Rouges Italiens', alcool: 1, stock: 15 },
                { nom: 'CHIANTI IL Palazzo 14% 2020 75CL', ingredients: 'Vin rouge italien Chianti premium', prix: 330000, categorie: 'Vins Rouges Italiens', alcool: 1, stock: 15 },

                // =========================================================================
                // VINS ROUGES AMERICAINS
                // =========================================================================
                { nom: 'CABERNET Rouge Eagle Creek California 12.5% 75cl', ingredients: 'Vin rouge californien Cabernet', prix: 180000, categorie: 'Vins Rouges Americains', alcool: 1, stock: 20 },
                { nom: 'CABERNET SAUVIGNON Southern H. Wente Vineyards Es Gro 13.5% 2019 75cl', ingredients: 'Vin rouge californien Cabernet Sauvignon', prix: 480000, categorie: 'Vins Rouges Americains', alcool: 1, stock: 10 },
                { nom: 'ZINFANDEL Rouge California Wente Vineyards Beyer Ranch 14.5% 2021 75C', ingredients: 'Vin rouge californien Zinfandel', prix: 480000, categorie: 'Vins Rouges Americains', alcool: 1, stock: 10 },

                // =========================================================================
                // Vin DOOKAN : A bulles
                // =========================================================================
                { nom: 'LES ANGES BRUT Cuvée Réserve Méthode Traditionnelle 12.5%', ingredients: 'Vin mousseux français', prix: 180000, categorie: 'Vin DOOKAN : A bulles', alcool: 1, stock: 15 },
                { nom: 'BOURGOGNE Cremant Blanc Brut Maison CHANZY 12% 2021 75Cl', ingredients: 'Vin mousseux français', prix: 480000, categorie: 'Vin DOOKAN : A bulles', alcool: 1, stock: 10 },
                { nom: 'PROSECCO BRUT Blanc Zonin 11% 20Cl', ingredients: 'Vin mousseux italien', prix: 70000, categorie: 'Vin DOOKAN : A bulles', alcool: 1, stock: 15 },
                { nom: 'PROSECCO BRUT Blanc Zonin 11% 75Cl', ingredients: 'Vin mousseux italien', prix: 240000, categorie: 'Vin DOOKAN : A bulles', alcool: 1, stock: 15 },
                { nom: 'SPARKLING Brut Sauvignon Blanc Du Toitskioof 12.5% 75Cl', ingredients: 'Vin mousseux sud-africain', prix: 220000, categorie: 'Vin DOOKAN : A bulles', alcool: 1, stock: 15 },
                { nom: 'SPARKLING Brut Rosé Kaapse Vonkel Cap Classic Simonsig 12% 2012 75Cl', ingredients: 'Vin mousseux sud-africain', prix: 360000, categorie: 'Vin DOOKAN : A bulles', alcool: 1, stock: 10 },

                // =========================================================================
                // Vin DOOKAN : CHAMPAGNE
                // =========================================================================
                { nom: 'TAITTINGER BRUT 12,5% 75Cl', ingredients: 'Champagne', prix: 2310000, categorie: 'Vin DOOKAN : CHAMPAGNE', alcool: 1, stock: 8 },
                { nom: 'TAITTINGER BRUT 12,5% 150Cl', ingredients: 'Champagne', prix: 4500000, categorie: 'Vin DOOKAN : CHAMPAGNE', alcool: 1, stock: 6 },

                // =========================================================================
                // VINS BLANCS Sud-Africains
                // =========================================================================
                { nom: 'SAUVIGNON Whispering Mountain 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 100000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'SAUVIGNON Welmoed 13% 2024/2025 75Cl', ingredients: 'Vin blanc sud-africain', prix: 120000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'SAUVIGNON Semillon Simonsig 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 150000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'SAUVIGNON Stellenbosch Vineyards 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 180000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHARDONNAY Whispering Mountain 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 100000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHARDONNAY Welmoed 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 120000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHARDONNAY Du Toitskioof 13.5% 2025 75Cl', ingredients: 'Vin blanc sud-africain', prix: 120000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHARDONNAY Pierre Dumont 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 120000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHARDONNAY (Unwooded) Stellenbosch Vineyards 13% 2022 75Cl', ingredients: 'Vin blanc sud-africain', prix: 180000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHARDONNAY Cape Fox Simonsig 13% 2021 75Cl', ingredients: 'Vin blanc sud-africain', prix: 270000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'CHARDONNAY CREDO Stellenbosch Vineyards 14% 2024 75Cl', ingredients: 'Vin blanc sud-africain', prix: 380000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'CHENIN Du Toitskioof 12.5% 2025 75Cl', ingredients: 'Vin blanc sud-africain', prix: 102000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHENIN Blanc Pierre Dumont 13.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 120000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHENIN Bushvine Stellenbosch Vineyards 13.5% 2022 75Cl', ingredients: 'Vin blanc sud-africain', prix: 180000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CHENIN CREDO Stellenbosch Vineyards 14% 2024 75Cl', ingredients: 'Vin blanc sud-africain', prix: 380000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'PINOT GRIGIO Welmoed 12.5% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 120000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'MEDITERRANEO The Grapesmi 13% 2020 75Cl (Bouchon)', ingredients: 'Vin blanc sud-africain', prix: 390000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'DIE KLUISENAAR The Grapesmi 13% 2020 75Cl (Bouchon)', ingredients: 'Vin blanc sud-africain', prix: 390000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'GEWURZTRAMINER Jamala Simonsig 13% 2023 75Cl', ingredients: 'Vin blanc sud-africain', prix: 200000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'VERSUS PENGVINO Cool White 13% 2024 75Cl', ingredients: 'Vin blanc sud-africain', prix: 90000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'VERSUS PENGVINO Sweet White Sensation 13% 75Cl', ingredients: 'Vin blanc sud-africain', prix: 90000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'Marianne Craft Wines, Natana White Blend', ingredients: 'Vin blanc sud-africain', prix: 96000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Ken Forrester Wines, Petit Sauvignon', ingredients: 'Vin blanc sud-africain', prix: 160000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Ken Forrester Wines, Petit Chardonnay', ingredients: 'Vin blanc sud-africain', prix: 160000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'A.A. Badenhorst, Secateurs Chenin Blanc', ingredients: 'Vin blanc sud-africain', prix: 190000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Southern Right, Sauvignon Blanc', ingredients: 'Vin blanc sud-africain', prix: 210000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'La Vierge Collection, Original Sin (Sauvignon Blanc)', ingredients: 'Vin blanc sud-africain', prix: 240000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Hamilton Russell Vineyard, Chardonnay', ingredients: 'Vin blanc sud-africain', prix: 600000, categorie: 'VINS BLANCS Sud-Africains', alcool: 1, stock: 15 },

                // =========================================================================
                // VINS ROUGES Sud-Africains
                // =========================================================================
                { nom: 'CABERNET SAUVIGNON Whispering Mountain 12.5% 2021/2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 100000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CABERNET SAUVIGNON Welmoed 12.5% 2024 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CABERNET SAUVIGNON SHIRAZ Du Toitskioof 13.5% 2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CABERNET SAUVIGNON Pierre Dumont 13.5% 2021 75Cl', ingredients: 'Vin rouge sud-africain', prix: 140000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CABERNET SAUVIGNON MERLOT Simonsig 13.5% 2020 75Cl (Bouchon)', ingredients: 'Vin rouge sud-africain', prix: 150000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CABERNET SAUVIGNON SHIRAZ Simonsig 13% 2021 75Cl', ingredients: 'Vin rouge sud-africain', prix: 150000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'CABERNET SAUVIGNON Stellenbosch Vineyards 13.5% 2021 75Cl (Bouchon)', ingredients: 'Vin rouge sud-africain', prix: 240000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'PINOTAGE Welmoed 14% 2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'PINOTAGE MERLOT RUBY CABERNET Du Toitskioof 14% 2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'PINOTAGE Du Toitskioof 14.5% 2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'PINOTAGE Bushvine Stellenbosch Vineyards 13.5% 2022 75Cl', ingredients: 'Vin rouge sud-africain', prix: 250000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'SHIRAZ Welmoed 13.5% 2021 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'SHIRAZ Du Toitskioof 14% 2021 75Cl', ingredients: 'Vin rouge sud-africain', prix: 120000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'SHIRAZ Stellenbosch Vineyards 14% 2021 75Cl', ingredients: 'Vin rouge sud-africain', prix: 240000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'SHIRAZ MERLOT VIOGNIER CREDO Stellenbosch Vineyards 14% 2022 75Cl', ingredients: 'Vin rouge sud-africain', prix: 380000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'VERSUS PENGVINO Dry RIP Current Red 12.5% 2021/2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 90000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'VERSUS PENGVINO Sweet Red Sensation 13% 75Cl', ingredients: 'Vin rouge sud-africain', prix: 90000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'SEVEN CENTURIES Pierre Dumont 14.5% 2022/2023 75Cl', ingredients: 'Vin rouge sud-africain', prix: 140000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'GRENACHE LIMITED RELEASE CREDO Stellenbosch Vineyards 13.5% 75Cl (Bouchon)', ingredients: 'Vin rouge sud-africain', prix: 380000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'Marianne Craft Wines, Natana Red Blend', ingredients: 'Vin rouge sud-africain', prix: 100000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Ken Forrester Wines, Petit Cabernet-Sauvignon', ingredients: 'Vin rouge sud-africain', prix: 150000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Kanonkop Estate, Kadette Cape Blend', ingredients: 'Vin rouge sud-africain', prix: 160000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Kanonkop Estate, Kadette Pinotage', ingredients: 'Vin rouge sud-africain', prix: 180000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'A.A. Badenhorst, Secateurs Shiraz Blend', ingredients: 'Vin rouge sud-africain', prix: 190000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Mullineux Wines, Kloof Street', ingredients: 'Vin rouge sud-africain', prix: 200000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'La Vierge Collection, Nymphomane', ingredients: 'Vin rouge sud-africain', prix: 270000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'La Vierge Collection, Pinot Noir', ingredients: 'Vin rouge sud-africain', prix: 430000, categorie: 'VINS ROUGES Sud-Africains', alcool: 1, stock: 15 },

                // =========================================================================
                // VINS ROSES Sud-Africains
                // =========================================================================
                { nom: 'VERSUS PENGVINO Sweet Sensation Rosé 9.5% 75Cl', ingredients: 'Vin rosé sud-africain', prix: 90000, categorie: 'VINS ROSES Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'VERSUS PENGVINO Dry All Day Rosé 12.5% 2025 75Cl', ingredients: 'Vin rosé sud-africain', prix: 90000, categorie: 'VINS ROSES Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'ROSE Welmoed 12% 2024 75Cl', ingredients: 'Vin rosé sud-africain', prix: 120000, categorie: 'VINS ROSES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'PINOTAGE Rosé Du Toitskioof 13% 2025 75Cl', ingredients: 'Vin rosé sud-africain', prix: 120000, categorie: 'VINS ROSES Sud-Africains', alcool: 1, stock: 15 },
                { nom: 'Ken Forrester Wines, Petit Rosé', ingredients: 'Vin rosé sud-africain', prix: 160000, categorie: 'VINS ROSES Sud-Africains', alcool: 1, stock: 15 },

                // =========================================================================
                // CUBITAINERS Sud-Africains
                // =========================================================================
                { nom: 'SAUVIGNON Blanc DU TOITSKLOOF 12.5% Cubi 3L', ingredients: 'Vin blanc cubitainer', prix: 220000, categorie: 'CUBITAINERS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'CHENIN Blanc DU TOITSKIOOF 13% Cubi 3L', ingredients: 'Vin blanc cubitainer', prix: 220000, categorie: 'CUBITAINERS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'Pinotage Merlot Ruby Cabernet 14% Cubi 3L', ingredients: 'Vin rouge cubitainer', prix: 220000, categorie: 'CUBITAINERS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'Cabernet Sauvignon Shiraz DU TOITSKOOLF 13.5% Cubi 3L', ingredients: 'Vin rouge cubitainer', prix: 220000, categorie: 'CUBITAINERS Sud-Africains', alcool: 1, stock: 10 },
                { nom: 'Pinotage Rosé DU TOITSKIOOF 13% Cubi 3L', ingredients: 'Vin rosé cubitainer', prix: 220000, categorie: 'CUBITAINERS Sud-Africains', alcool: 1, stock: 10 },

                // =========================================================================
                // EN BRIQUE Sud-Africains
                // =========================================================================
                { nom: 'ORC Natural Sweet White 11.5% Brique 1L', ingredients: 'Vin blanc brique', prix: 80000, categorie: 'EN BRIQUE Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'ORC Blanc de Blanc Crisp & Fruity 11% Brique 1L', ingredients: 'Vin blanc brique', prix: 80000, categorie: 'EN BRIQUE Sud-Africains', alcool: 1, stock: 20 },
                { nom: 'ORC Dry Red 12.5% Brique 1L', ingredients: 'Vin rouge brique', prix: 80000, categorie: 'EN BRIQUE Sud-Africains', alcool: 1, stock: 20 },

                // =========================================================================
                // VINS BLANCS Français
                // =========================================================================
                { nom: 'GEWURZTRAMINER Joseph Cattin Sauvage 13.5% 2020 75Cl', ingredients: 'ALSACE', prix: 340000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'RIESLING Joseph Cattin Sauvage 12.5% 2021 75Cl', ingredients: 'ALSACE', prix: 350000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'SENTEURS Des Vignes Domaine Albert Mann 13% 2022 75Cl', ingredients: 'ALSACE', prix: 360000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'RIESLING Domaine Albert Mann 13% 2022 75Cl', ingredients: 'ALSACE', prix: 600000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'ANJOU Chenin Elysis Les Caves de la Loire 11,5% 2024 75Cl', ingredients: 'ANJOU', prix: 180000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX ENTRE DEUX MERS Cht Grand Rousseau 12% 2024 75Cl', ingredients: 'BORDEAUX', prix: 120000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX SAUVIGNON Maison Blanche Famille Bouey 12% 2021 75Cl', ingredients: 'BORDEAUX', prix: 120000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Cht Les Cinq Pattes 12% 2020 75Cl', ingredients: 'BORDEAUX', prix: 150000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE SAUVIGNON Saint Bris Ica Onna JM Brocard 12,5% 2021 75Cl', ingredients: 'BOURGOGNE', prix: 230000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE CHARDONNAY Les Essentielles de Mancey 12,5% 2021 75Cl', ingredients: 'BOURGOGNE', prix: 270000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE CHARDONNAY Signé Bourgogne 13% 2023 75Cl', ingredients: 'BOURGOGNE', prix: 270000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE CHARDONNAY Kimmeridgien JM Brocard 12,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 280000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE SAUVIGNON St Bris La Bourgondie 12% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 300000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE ALIGOTE Les Fortunés Maison CHANZY 12µ 2022 75Cl', ingredients: 'BOURGOGNE', prix: 320000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE CHARDONNAY Domaine du Champ Fleury 12,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 320000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE CHARDONNAY Les Fortunés Maison CHANZY 12,5% 75Cl', ingredients: 'BOURGOGNE', prix: 420000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE CHABLIS Domaine Alain Geoffroy 12,5% 2023 75Cl', ingredients: 'BOURGOGNE', prix: 440000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE Chablis Grivot - Goisot 12,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 480000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE BOUZERON Blanc Les Trois Maison CHANZY 12,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 480000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'CHABLIS Domaine Des Quatres Saisons 12,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 480000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'CHABLIS Vieilles Vignes Domaine L. Chatelaine 13% 2021 75Cl', ingredients: 'BOURGOGNE', prix: 540000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE COTES de Beaune Domaine de la Juvinière 12,5% 2018 75Cl', ingredients: 'BOURGOGNE', prix: 570000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'SAUVIGNON Val de Loire Les Anges 11% 2024 75Cl', ingredients: 'LOIRE', prix: 140000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'TOURAINE Le Sauvignon Cht de Fontenay 13% 2022 75Cl', ingredients: 'LOIRE', prix: 300000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'MUSCADET ACCOSTAGE Sèvre et Maine Ménard Gaborit 13% 2023 75Cl', ingredients: 'LOIRE', prix: 330000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'POUILLY FUME Les Roches Blanches 12,5% 2022/2023 75Cl', ingredients: 'LOIRE', prix: 450000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'SANCERRE Sauvignon Blanc La Colline Aux Princes 11% 2023 75Cl', ingredients: 'LOIRE', prix: 510000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'SANCERRE Blanc Daniel Reverdy & Files méda. d\'Or 2023 12,5% 2022 75Cl', ingredients: 'LOIRE', prix: 540000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'CHARDONNAY Reserve St Marc Vignobles Foncalieu 13.5% 2023 75Cl', ingredients: 'PAYS D\'OC', prix: 120000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'VDP OC Séduction Blanc La Sanglière Famille Devictor 11% 2024 75Cl', ingredients: 'PAYS D\'OC', prix: 210000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'CHARDONNAY Famille Guilhem 13% 2022 75Cl', ingredients: 'PAYS D\'OC', prix: 270000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'CHARDONNAY Péjugés Feeling Distdent Maison Ventenac 12,5% 2022/2023 75Cl', ingredients: 'PAYS D\'OC', prix: 300000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'CHARDONNAY Fleur du Sel Vignobles David 13% 2023 75Cl', ingredients: 'PAYS D\'OC', prix: 360000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Les Cardinalices Blanc DEMAZET 13% 2024 75Cl', ingredients: 'RHONE', prix: 120000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'VIOGNIER Blanc Première Note Cave de Tain 13% 2024 75Cl', ingredients: 'RHONE', prix: 180000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'VIOGNIER Blanc Cyparis Demazet 12,5% 2024 75Cl', ingredients: 'RHONE', prix: 270000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'COTES DE GASCOGNE Blanc Sec Toquade Vif et Aromatique 11,5% 2022 75Cl', ingredients: 'SUD OUEST', prix: 120000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'GAILLAC Sec La Croix St Salvy 12% 2022 75Cl', ingredients: 'SUD OUEST', prix: 140000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'IGP COTES DE GASCOGNE Colombard Sec Perle Blanche 11,5% 2024 75Cl', ingredients: 'SUD OUEST', prix: 140000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'COTES DE GASCOGNE Sauvignon Blanc Tel quel Domaine Denis Tastet 12% 2024 75Cl', ingredients: 'SUD OUEST', prix: 140000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'GAILLAC Blanc Doux Croix St Salvy 11.5% 2020/2021 75Cl', ingredients: 'SUD OUEST', prix: 160000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'MONBAZILLAC Blanc Cht Peyronnette Prestige 13% 2018 75Cl', ingredients: 'SUD OUEST', prix: 180000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },
                { nom: 'LES BRAS M\'EN TOMBENT Blanc Cuisine en Famille 13% 2024 75Cl', ingredients: 'MEDITERRANNE', prix: 240000, categorie: 'VINS BLANCS Français', alcool: 1, stock: 10 },

                // =========================================================================
                // VINS ROUGES Français 
                // =========================================================================
                { nom: 'BEAUJOLAIS Gamay La Famille K La Mère 12,5% 2021 75CL', ingredients: 'BEAUJOLAIS', prix: 210000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BEAUJOLAIS Villages Selection de la Hante La Cave du Cht de Chénas 12,5% 2021 75Cl', ingredients: 'BEAUJOLAIS', prix: 270000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX SUPERIEUR Cht de Marsan 13,5% 2020 37,5CL', ingredients: 'BORDEAUX SUP', prix: 90000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX SUPERIEUR Rouge Cht Luchey 13.5% 2020 75Cl', ingredients: 'BORDEAUX SUP', prix: 135000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX SUPERIEUR Cru Monplaisir Gonet Medeville 2020 75Cl', ingredients: 'BORDEAUX SUP', prix: 276000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Rouge Les Hauts de Rousseau 13% 2023 75Cl', ingredients: 'BORDEAUX', prix: 72000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Rouge Cht Grand Rousseau 13% 2022 75Cl', ingredients: 'BORDEAUX', prix: 90000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Rouge Cht Des Trois Tours 12.5% 2022 75Cl', ingredients: 'BORDEAUX', prix: 99000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Cht Talon 14% 2022 75Cl', ingredients: 'BORDEAUX', prix: 102000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Cht Péricou 14% 2022 75Cl', ingredients: 'BORDEAUX', prix: 111000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Rouge Cht Haut Branda 13% 2023 75Cl', ingredients: 'BORDEAUX', prix: 114000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BLAYE COTES DE BORDEAUX Beau Guillaume 13% 2022 75Cl', ingredients: 'BORDEAUX', prix: 126000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BLAYES COTES BORDEAUX Cht Peyre Blanque 13% 2018 75Cl', ingredients: 'BORDEAUX', prix: 131750, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX MALBEC Baron Larose 13% 2022 75Cl', ingredients: 'BORDEAUX', prix: 135000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX CABERNET SAUVIGNON Baron Larose 13% 2022 75Cl', ingredients: 'BORDEAUX', prix: 138000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX MERLOT Baron Larose 13.5% 2022 75Cl', ingredients: 'BORDEAUX', prix: 138000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DE BOURG Cht Haut Perringue 12% 2024 75Cl', ingredients: 'BORDEAUX', prix: 162000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'GRAVES Rouge Cht Ordonnat 13% 2021 75Cl', ingredients: 'BORDEAUX', prix: 180000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'MEDOC Cru Bourgeois Cht Mareil 2018 75Cl', ingredients: 'BORDEAUX', prix: 195000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'MONTAGNE SAINT EMILION Cht Tour Calon 13% 2015 75Cl', ingredients: 'BORDEAUX', prix: 210000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'LUSSAC SAINT EMILION Cht Blanchon 14.5% 2022 75Cl', ingredients: 'BORDEAUX', prix: 240000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Cht Le Sêpe Cuvée Initiale 2014 75Cl', ingredients: 'BORDEAUX', prix: 270000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'HAUT MEDOC Rouge Cru Bourgeois Cht Muret Médaillé d\'or 2017 75Cl', ingredients: 'BORDEAUX', prix: 315000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT EMILION Cht Puy Razac 13% 2023 75Cl', ingredients: 'BORDEAUX', prix: 360000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT EMILION Grand Cru Cht Haut Boutisse 12,5% 2021 75Cl', ingredients: 'BORDEAUX', prix: 420000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'HAUT MEDOC Rouge Cru Bourgeois Cht Bel Air Gloria 13% 2017 75Cl', ingredients: 'BORDEAUX', prix: 420000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'HAUT MEDOC Rouge Moulin de Citran 13% 2015 75Cl', ingredients: 'BORDEAUX', prix: 450000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'PESSAC LEGONAN Rouge Cht Haut L\'evêque 13,5% 2018 75Cl', ingredients: 'BORDEAUX', prix: 480000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'PAUILLAC Rouge Cru Bourgeois Cht Plantey 2019 Méd.Argent 75Cl', ingredients: 'BORDEAUX', prix: 600000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT JULIEN Cht Sirène 13% 2021 75Cl', ingredients: 'BORDEAUX', prix: 600000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT JULIEN Esprit de Gloria Domaine Henri Martin 13,5% 2018 75Cl', ingredients: 'BORDEAUX', prix: 840000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT JULIEN Cht Moulin de la Rose 2015 75Cl', ingredients: 'BORDEAUX', prix: 997500, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE PINOT NOIR Chatel Buis 13% 2023 75Cl', ingredients: 'BOURGOGNE', prix: 285000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE PINOT NOIR Rouge Signé Bourgogne 12,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 300000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE PINOT NOIR Cuvée Folch Domaine Cardon 13% 2021 75Cl', ingredients: 'BOURGOGNE', prix: 360501, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'BOURGOGNE PINOT NOIR Les Fortunés Maison CHANZY 13,5% 2022 75Cl', ingredients: 'BOURGOGNE', prix: 420000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DE GASCOGNE Thesaurus Domaine Denis Tastet 12% 2024 75Cl', ingredients: 'SUD OUEST', prix: 127500, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'ROUSSILLON MUNT Famille Dornier 13% 2021 75Cl', ingredients: 'LANGUEDOC', prix: 274251, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'PIC SAINT LOUP Cht Lanoyre Clos Des Combes 14% 2023 75Cl', ingredients: 'LANGUEDOC', prix: 330000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'PINOT NOIR Les Anges Val de Loire 12% 2023 75Cl', ingredients: 'LOIRE', prix: 135000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'TOURAINE GAMAY Noir Cave de la Tourangelle Cuvée Les Arpents 12% 2024 75Cl', ingredients: 'LOIRE', prix: 150000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAUMUR CHAMPIGNY Domaine Seigneurie 13,5% 2020 75Cl', ingredients: 'LOIRE', prix: 180000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'MOZAIK Loire Domaine Pithon Pailé 2015 75CL', ingredients: 'LOIRE', prix: 321000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'CHINON Le Petit Chemin Domaine Du Saut au Loup 13% 2020 75Cl', ingredients: 'LOIRE', prix: 375000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'CABERNET SAUVIGNON Les Foncanelles IGP 13,5% 2021 75Cl', ingredients: 'PAYS D\'OC', prix: 112500, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'CABERNET SAUVIGNON Reserve Saint Marc 13.5% 2023 75Cl', ingredients: 'PAYS D\'OC', prix: 120000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'MERLOT Réserve Saint Marc Domaine Foncalieu 13,5% 2022 75Cl', ingredients: 'PAYS D\'OC', prix: 120000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'TERRE METISSEE 7 Cépages 13,5% 2022/2023 75Cl', ingredients: 'PAYS D\'OC', prix: 189000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'VDP OC Séduction Rouge La Sanglière Famille Devictor 13% 2023 75CL', ingredients: 'PAYS D\'OC', prix: 210000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Les Cardinalices Rouge DEMAZET 14.5% 2023 75Cl', ingredients: 'RHONE', prix: 120000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Armoiries DEMAZET 14% 2021/2022 75Cl', ingredients: 'RHONE', prix: 135000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Domaine Croisette DEMAZET 14,5% 2023 Méd.d\'Argent 75Cl', ingredients: 'RHONE', prix: 150999, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Domaines des Mascarons DEMAZET 14,5% 2023 75Cl', ingredients: 'RHONE', prix: 150999, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SYRAH Première Note Cave de Tain 13% 2022 75Cl', ingredients: 'RHONE', prix: 165000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Rouge Dom. des Gravennes Lou Pitchoun 13,5% 2021 75Cl', ingredients: 'RHONE', prix: 225000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'CROZES HERMITAGE Cave de Tain Nobles Rives 13% 2023 75Cl', ingredients: 'RHONE', prix: 390000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT JOSEPH Cave de Tain Nobles Rives 13% 2020 75Cl', ingredients: 'RHONE', prix: 480000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'SAINT CHINIAN Cuvée Saint Christophe 13.5% 2022 75Cl', ingredients: 'SUD', prix: 156000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },
                { nom: 'LES BRAS M\'EN TOMBENT Rouge Cuisine en Famille 14% 2024 75Cl', ingredients: 'MEDITERRANNE', prix: 210000, categorie: 'VINS ROUGES Français', alcool: 1, stock: 10 },

                // =========================================================================
                // VINS ROSES Français
                // =========================================================================
                { nom: 'BORDEAUX Rosé Cht Grand Rousseau 12% 2025 75Cl', ingredients: 'BORDEAUX', prix: 108000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Rosé Baron de Pierre Maison Bouey 12,5% 2022 75Cl', ingredients: 'BORDEAUX', prix: 108000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Les Trois Colonnes 12% 2024 75Cl', ingredients: 'BORDEAUX', prix: 126000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'BORDEAUX Rosé Cht Cazeau 12% 2023 75Cl', ingredients: 'BORDEAUX', prix: 135000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'CABERNET FRANC Les Anges 11% 2024 75Cl', ingredients: 'LOIRE', prix: 120000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'CABERNET D\'ANJOU Ambroisie Val de Loire 10,5% 2024 75Cl', ingredients: 'LOIRE', prix: 135000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'MEDITERRANNE Rosé Cuisine en Famille 12,5% 2024 75Cl', ingredients: 'MEDITERRANNE', prix: 195000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'COTES DU RHONE Les Cardinalices Rosé DEMAZET 12,5% 2023 75Cl', ingredients: 'RHONE', prix: 120000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'ROSE DE SYRAH Première Note Cave de Tain 12,5% 2022 75Cl', ingredients: 'RHONE', prix: 165000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'CINSAULT Rosé Reserve St Marc Vignobles Foncalieu 12.5% 2023 75Cl', ingredients: 'PAYS D\'OC', prix: 120000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'VDP OC Séduction Rosé La Sanglière Domaine Devictor 13% 2024 75Cl', ingredients: 'PAYS D\'OC', prix: 210000, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },
                { nom: 'GAILLAC Rosé La Croix St Salvy 12% 2024 75Cl', ingredients: 'SUD OUEST', prix: 115500, categorie: 'VINS ROSES Français', alcool: 1, stock: 10 },

                // =========================================================================
                // CONSIGNES & DIVERS (Accessoires, Shisha, Bouteilles vides, Cageots)
                // =========================================================================
                { nom: 'Avoirs Bouteille Vide 30/33cl', ingredients: 'Consigne bouteille vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 100 },
                { nom: 'Avoirs Bouteille Vide 50/65cl', ingredients: 'Consigne bouteille vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 100 },
                { nom: 'Avoirs Bouteille Vide 100cl', ingredients: 'Consigne bouteille vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 100 },
                { nom: 'Avoirs Bouteille Sodeam 100cl', ingredients: 'Consigne bouteille sodeam', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 50 },
                { nom: 'Avoirs Bouteille Ranovisy', ingredients: 'Consigne bouteille ranovisy', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 50 },
                { nom: 'Cageot de 12', ingredients: 'Cageot vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 20 },
                { nom: 'Cageot de 20', ingredients: 'Cageot vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 20 },
                { nom: 'Cageot de 24', ingredients: 'Cageot vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 20 },
                { nom: 'Cageot Ranovisy', ingredients: 'Cageot ranovisy vide', prix: 0, categorie: 'Consignes & Divers', alcool: 0, stock: 20 },
                { nom: 'Parfum Shisha', ingredients: 'Parfum pour chisha', prix: 20000, categorie: 'Consignes & Divers', alcool: 0, stock: 15 },
                { nom: 'Charbon Shisha', ingredients: 'Charbon pour chisha', prix: 10000, categorie: 'Consignes & Divers', alcool: 0, stock: 30 },

                // =========================================================================
                // THÉS D'EXCEPTION (Thés chauds)
                // =========================================================================
                // --- Thés Verts & Noirs ---
                { nom: 'Green Tea (Vietnam)', ingredients: 'Thé vert du Vietnam', prix: 16000, categorie: 'Thé d\'exception > Thé Vert & Noir', alcool: 0, stock: 30 },
                { nom: 'Osmanthus (Thaïlande)', ingredients: 'Thé aux fleurs d\'osmanthe', prix: 16000, categorie: 'Thé d\'exception > Thé Vert & Noir', alcool: 0, stock: 30 },
                { nom: 'Oolong N°17 (Thaïlande)', ingredients: 'Thé oolong', prix: 16000, categorie: 'Thé d\'exception > Thé Vert & Noir', alcool: 0, stock: 30 },
                { nom: 'Matcha Japon Premium', ingredients: 'Thé matcha premium du Japon', prix: 20000, categorie: 'Thé d\'exception > Thé Vert & Noir', alcool: 0, stock: 25 },
                // --- Infusions & Spécialités d'Origine Inde ---
                { nom: 'Masala Chai (Inde Infusions)', ingredients: 'Infusion épicée indienne', prix: 10000, categorie: 'Thé d\'exception > Infusion', alcool: 0, stock: 40 },
                { nom: 'Hibiscus (Inde Infusions)', ingredients: 'Infusion hibiscus', prix: 10000, categorie: 'Thé d\'exception > Infusion', alcool: 0, stock: 40 },
                { nom: 'Jasmin (Inde Infusions)', ingredients: 'Infusion fleur de jasmin', prix: 10000, categorie: 'Thé d\'exception > Infusion', alcool: 0, stock: 40 },

                // =========================================================================
                // THÉ GLACÉ (Thés froids)
                // =========================================================================
                // --- Thés Verts & Noirs (Glacés) ---
                { nom: 'Green Tea (Vietnam) (Glacé)', ingredients: 'Thé vert glacé', prix: 22000, categorie: 'Thé Glacé > Thé Vert & Noir', alcool: 0, stock: 30 },
                { nom: 'Osmanthus (Thaïlande) (Glacé)', ingredients: 'Thé osmanthus glacé', prix: 22000, categorie: 'Thé Glacé > Thé Vert & Noir', alcool: 0, stock: 30 },
                { nom: 'Oolong N°17 (Thaïlande) (Glacé)', ingredients: 'Thé oolong glacé', prix: 22000, categorie: 'Thé Glacé > Thé Vert & Noir', alcool: 0, stock: 30 },
                { nom: 'Matcha Japon Premium (Glacé)', ingredients: 'Thé matcha premium glacé', prix: 26000, categorie: 'Thé Glacé > Thé Vert & Noir', alcool: 0, stock: 25 },
                // --- Infusions (Glacées) ---
                { nom: 'Hibiscus (Inde Infusions) (Glacé)', ingredients: 'Infusion hibiscus glacée', prix: 16000, categorie: 'Thé Glacé > Infusion', alcool: 0, stock: 40 },
                { nom: 'Jasmin (Inde Infusions) (Glacé)', ingredients: 'Infusion jasmin glacée', prix: 16000, categorie: 'Thé Glacé > Infusion', alcool: 0, stock: 40 },

                // =========================================================================
                // MATERIEL
                // =========================================================================
                { nom: 'Shisha Lumineuse géante', ingredients: 'Shisha lumineuse', prix: 500000, categorie: 'Materiel', alcool: 0, stock: 5 },
                { nom: 'Shisha géante Simple', ingredients: 'Shisha géante', prix: 400000, categorie: 'Materiel', alcool: 0, stock: 5 },
                { nom: 'Petite Shisha', ingredients: 'Petite shisha', prix: 200000, categorie: 'Materiel', alcool: 0, stock: 10 },
                { nom: 'Cendriers et verres simples', ingredients: 'Cendriers et verres', prix: 7000, categorie: 'Materiel', alcool: 0, stock: 20 },
                { nom: 'Vitres Tables grande rectangle', ingredients: 'Vitre table grande rectangle', prix: 100000, categorie: 'Materiel', alcool: 0, stock: 10 },
                { nom: 'Vitres Petite rectangle', ingredients: 'Vitre table petite rectangle', prix: 70000, categorie: 'Materiel', alcool: 0, stock: 10 },
                { nom: 'Queue de billiard', ingredients: 'Queue de billiard', prix: 150000, categorie: 'Materiel', alcool: 0, stock: 5 },
                { nom: 'Boule de billiard', ingredients: 'Boule de billiard', prix: 50000, categorie: 'Materiel', alcool: 0, stock: 10 }
            ];

            let insertedCount = 0;
            let renamedCount = 0;
            let removedCount = 0;
            const keptDuplicates = [];

            for (const item of items) {
                // Vérifier si le produit existe déjà dans bar_products
                let [existing] = await pool.query(
                    'SELECT id FROM bar_products WHERE nom = ?',
                    [item.nom]
                );

                const aliases = item.alias || [];
                if (aliases.length > 0) {
                    const [aliasRows] = await pool.query(
                        'SELECT id, nom FROM bar_products WHERE nom IN (?) ORDER BY id',
                        [aliases]
                    );
                    let duplicates = aliasRows;

                    // Pas encore d'article sous le nouveau nom : on renomme l'ancien (son historique est conservé)
                    if (existing.length === 0 && aliasRows.length > 0) {
                        const [first, ...rest] = aliasRows;
                        await pool.query('UPDATE bar_products SET nom = ? WHERE id = ?', [item.nom, first.id]);
                        existing = [{ id: first.id }];
                        duplicates = rest;
                        renamedCount++;
                    }

                    // Doublons restants : supprimés s'ils n'ont aucune vente, sinon signalés
                    for (const dup of duplicates) {
                        const [[{ ventes }]] = await pool.query(
                            'SELECT COUNT(*) AS ventes FROM bar_transactions WHERE product_id = ?',
                            [dup.id]
                        );
                        if (Number(ventes) === 0) {
                            await pool.query('DELETE FROM bar_stock WHERE product_id = ?', [dup.id]);
                            await pool.query('DELETE FROM bar_products WHERE id = ?', [dup.id]);
                            removedCount++;
                        } else {
                            keptDuplicates.push(`${dup.nom} (id ${dup.id}, ${ventes} vente(s)) → doublon de « ${item.nom} »`);
                        }
                    }
                }

                let productId;

                if (existing.length > 0) {
                    productId = existing[0].id;
                    // Mettre à jour le produit existant
                    await pool.query(
                        `UPDATE bar_products 
                         SET ingredients = ?, prix = ?, categorie = ?, alcool = ?, type_produit = 'PRODUIT_FINI', source_module = 'BAR'
                         WHERE id = ?`,
                        [item.ingredients, item.prix, item.categorie, item.alcool, productId]
                    );
                } else {
                    // Insérer le nouveau produit
                    const [result] = await pool.query(
                        `INSERT INTO bar_products (nom, ingredients, prix, categorie, alcool, type_produit, source_module) 
                         VALUES (?, ?, ?, ?, ?, 'PRODUIT_FINI', 'BAR')`,
                        [item.nom, item.ingredients, item.prix, item.categorie, item.alcool]
                    );
                    productId = result.insertId;
                    insertedCount++;
                }

                // Gérer le stock dans bar_stock
                const [stockCheck] = await pool.query(
                    'SELECT id FROM bar_stock WHERE product_id = ?',
                    [productId]
                );

                if (stockCheck.length === 0) {
                    await pool.query(
                        'INSERT INTO bar_stock (product_id, quantite) VALUES (?, ?)',
                        [productId, item.stock]
                    );
                }
            }

            console.log(`\n📊 Résumé du seeder Bar Quintana Sky :`);
            console.log(`   ✅ ${insertedCount} nouvelle(s) boisson(s) / article(s) inséré(s) dans bar_products`);
            console.log(`   ✏️  ${renamedCount} article(s) renommé(s) au nom unique`);
            console.log(`   🧹 ${removedCount} doublon(s) sans vente supprimé(s)`);
            if (keptDuplicates.length > 0) {
                console.log(`   ⚠️  ${keptDuplicates.length} doublon(s) conservé(s) car déjà vendu(s), à vérifier :`);
                keptDuplicates.forEach((line) => console.log(`      - ${line}`));
            }
            console.log(`   📋 Total traité : ${items.length} articles`);
            console.log('✅ Seeder des boissons du bar terminé avec succès !\n');

        } catch (error) {
            console.error('❌ Erreur lors du seeder des boissons du bar :', error.message);
            throw error;
        }
    }
}

if (require.main === module) {
    const seeder = new SeedQuintanaSkyDrinks();
    seeder.run()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = SeedQuintanaSkyDrinks;