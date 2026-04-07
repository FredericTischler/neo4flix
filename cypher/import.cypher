// ============================================================
// Neo4flix — Import MovieLens ml-latest-small
// Syntaxe Neo4j 5.x
// ============================================================

// ----------------------------------------------------------
// 1. Contraintes d'unicité et index
// ----------------------------------------------------------

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.userId IS UNIQUE;

CREATE CONSTRAINT movie_id_unique IF NOT EXISTS
FOR (m:Movie) REQUIRE m.movieId IS UNIQUE;

CREATE CONSTRAINT genre_name_unique IF NOT EXISTS
FOR (g:Genre) REQUIRE g.name IS UNIQUE;

CREATE INDEX movie_title_index IF NOT EXISTS
FOR (m:Movie) ON (m.title);

// ----------------------------------------------------------
// 2. Import des genres (extraits de movies.csv, colonne genres séparée par |)
// ----------------------------------------------------------

LOAD CSV WITH HEADERS FROM 'file:///movielens/movies.csv' AS row
WITH split(row.genres, '|') AS genres
UNWIND genres AS genre
WITH DISTINCT genre
WHERE genre <> '(no genres listed)'
MERGE (:Genre {name: genre});

// ----------------------------------------------------------
// 3. Import des films (parser le titre pour extraire l'année)
// ----------------------------------------------------------

LOAD CSV WITH HEADERS FROM 'file:///movielens/movies.csv' AS row
WITH row,
     CASE
       WHEN row.title =~ '.*\\(\\d{4}\\)$'
       THEN toInteger(substring(trim(row.title), size(trim(row.title)) - 5, 4))
       ELSE null
     END AS year,
     CASE
       WHEN row.title =~ '.*\\(\\d{4}\\)$'
       THEN trim(substring(trim(row.title), 0, size(trim(row.title)) - 7))
       ELSE trim(row.title)
     END AS cleanTitle
MERGE (m:Movie {movieId: row.movieId})
SET m.title = cleanTitle,
    m.year = year;

// ----------------------------------------------------------
// 4. Relations Movie → Genre
// ----------------------------------------------------------

LOAD CSV WITH HEADERS FROM 'file:///movielens/movies.csv' AS row
WITH row, split(row.genres, '|') AS genres
MATCH (m:Movie {movieId: row.movieId})
UNWIND genres AS genre
WITH m, genre
WHERE genre <> '(no genres listed)'
MATCH (g:Genre {name: genre})
MERGE (m)-[:IN_GENRE]->(g);

// ----------------------------------------------------------
// 5. Import des utilisateurs et des notes (ratings.csv)
// ----------------------------------------------------------

LOAD CSV WITH HEADERS FROM 'file:///movielens/ratings.csv' AS row
CALL {
  WITH row
  MERGE (u:User {userId: row.userId})
  WITH u, row
  MATCH (m:Movie {movieId: row.movieId})
  MERGE (u)-[:RATED {score: toFloat(row.rating), timestamp: toInteger(row.timestamp)}]->(m)
} IN TRANSACTIONS OF 1000 ROWS;