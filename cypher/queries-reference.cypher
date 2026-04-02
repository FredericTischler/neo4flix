// ============================================================
// Neo4flix — Requêtes Cypher de référence
// ============================================================

// ==========================================================
// REQUÊTES DE BASE
// ==========================================================

// --- Trouver un film par titre (recherche partielle, insensible à la casse) ---
// Utile pour la barre de recherche du moteur de recommandation.
MATCH (m:Movie)
WHERE toLower(m.title) CONTAINS toLower('toy story')
RETURN m.movieId, m.title, m.year
ORDER BY m.year;

// --- Lister les films d'un genre donné ---
// Permet d'explorer le catalogue par genre.
MATCH (m:Movie)-[:IN_GENRE]->(g:Genre {name: 'Sci-Fi'})
RETURN m.title, m.year
ORDER BY m.year DESC
LIMIT 20;

// --- Afficher les notes d'un utilisateur avec les titres des films ---
// Vue profil utilisateur : historique de visionnage et notes.
MATCH (u:User {userId: '1'})-[r:RATED]->(m:Movie)
RETURN m.title, r.score, r.timestamp
ORDER BY r.score DESC;


// ==========================================================
// REQUÊTES DE RECOMMANDATION
// ==========================================================

// --- Collaborative filtering ---
// "Les utilisateurs qui ont aimé les mêmes films que moi ont aussi aimé..."
// Principe : on trouve les utilisateurs similaires (films en commun notés >= 4),
// puis on recommande les films qu'ils ont aimés et que l'utilisateur cible n'a pas vus.
MATCH (u:User {userId: '1'})-[r1:RATED]->(m:Movie)<-[r2:RATED]-(other:User)
WHERE r1.score >= 4 AND r2.score >= 4 AND u <> other
WITH other, count(m) AS commonMovies
WHERE commonMovies >= 3
ORDER BY commonMovies DESC
LIMIT 10
MATCH (other)-[r:RATED]->(rec:Movie)
WHERE r.score >= 4
  AND NOT EXISTS { MATCH (:User {userId: '1'})-[:RATED]->(rec) }
RETURN rec.title, rec.year, count(*) AS recommendations, round(avg(r.score), 2) AS avgScore
ORDER BY recommendations DESC, avgScore DESC
LIMIT 15;

// --- Content-based filtering ---
// "Films du même genre que ceux que j'ai bien notés (score >= 4)"
// Principe : on identifie les genres préférés de l'utilisateur,
// puis on recommande les films les mieux notés dans ces genres.
MATCH (u:User {userId: '1'})-[r:RATED]->(m:Movie)-[:IN_GENRE]->(g:Genre)
WHERE r.score >= 4
WITH g, count(*) AS genreCount
ORDER BY genreCount DESC
LIMIT 3
MATCH (rec:Movie)-[:IN_GENRE]->(g)
WHERE NOT EXISTS { MATCH (:User {userId: '1'})-[:RATED]->(rec) }
WITH rec, collect(g.name) AS genres, count(g) AS matchingGenres
ORDER BY matchingGenres DESC
LIMIT 15
OPTIONAL MATCH (rec)<-[r:RATED]-()
RETURN rec.title, rec.year, genres, matchingGenres, round(avg(r.score), 2) AS avgScore, count(r) AS nbRatings
ORDER BY matchingGenres DESC, avgScore DESC;

// --- Top films par note moyenne (avec minimum de votes) ---
// Le filtre sur le nombre minimum de votes évite le biais
// des films avec une seule note à 5/5.
MATCH (m:Movie)<-[r:RATED]-()
WITH m, avg(r.score) AS avgRating, count(r) AS nbRatings
WHERE nbRatings >= 50
RETURN m.title, m.year, round(avgRating, 2) AS avgRating, nbRatings
ORDER BY avgRating DESC
LIMIT 20;


// ==========================================================
// REQUÊTES GDS (Graph Data Science)
// ==========================================================

// --- Projection d'un graphe in-memory pour Node Similarity ---
// On projette un graphe biparti User-Movie via la relation RATED.
// Ce graphe en mémoire est utilisé par les algorithmes GDS
// sans modifier le graphe persistant.
CALL gds.graph.project(
  'user-movie-ratings',
  ['User', 'Movie'],
  {
    RATED: {
      type: 'RATED',
      properties: 'score'
    }
  }
);

// --- Calcul de similarité Jaccard entre utilisateurs ---
// Jaccard mesure le chevauchement des ensembles de films notés.
// Plus deux utilisateurs ont de films en commun, plus ils sont similaires.
// topK=10 : on ne garde que les 10 voisins les plus proches par utilisateur.
CALL gds.nodeSimilarity.stream('user-movie-ratings', {
  topK: 10,
  similarityCutoff: 0.1
})
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS user1, gds.util.asNode(node2) AS user2, similarity
WHERE user1:User AND user2:User
RETURN user1.userId AS user1, user2.userId AS user2, round(similarity, 4) AS similarity
ORDER BY similarity DESC
LIMIT 20;

// --- Récupération des voisins les plus similaires pour un utilisateur donné ---
// Permet de trouver les "jumeaux de goût" d'un utilisateur précis,
// base du collaborative filtering via GDS.
CALL gds.nodeSimilarity.stream('user-movie-ratings', {
  topK: 10,
  similarityCutoff: 0.1
})
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS user1, gds.util.asNode(node2) AS user2, similarity
WHERE user1.userId = '1' AND user1:User AND user2:User
RETURN user2.userId AS similarUser, round(similarity, 4) AS similarity
ORDER BY similarity DESC
LIMIT 10;

// --- Nettoyage : supprimer la projection quand on n'en a plus besoin ---
// Libère la mémoire occupée par le graphe in-memory.
CALL gds.graph.drop('user-movie-ratings');