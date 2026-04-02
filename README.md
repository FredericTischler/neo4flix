# Neo4flix — Phase 0 : Fondations Neo4j

Moteur de recommandation de films basé sur Neo4j et le dataset MovieLens.

## Prérequis

- Docker et Docker Compose
- `curl` et `unzip` (pour le téléchargement du dataset)

## Démarrage rapide

### 1. Lancer Neo4j

```bash
docker compose -f docker-compose.neo4j.yml up -d
```

### 2. Importer les données MovieLens

Le script télécharge automatiquement le dataset, attend que Neo4j soit prêt, puis lance l'import :

```bash
./scripts/init-neo4j.sh
```

L'import crée :
- **Nœuds** : `User`, `Movie` (avec titre et année), `Genre`
- **Relations** : `RATED` (score + timestamp), `IN_GENRE`

### 3. Explorer les données

Ouvrir le Neo4j Browser : [http://localhost:7474](http://localhost:7474)

- **Identifiants** : `neo4j` / `neo4flix2024`
- **Protocole Bolt** : `bolt://localhost:7687`

Les requêtes de référence sont dans `cypher/queries-reference.cypher`. Vous pouvez les copier-coller dans le Neo4j Browser pour les exécuter.

## Structure du projet

```
neo4flix/
├── docker-compose.neo4j.yml    # Compose isolé Neo4j + GDS
├── data/movielens/              # Dataset MovieLens (gitignored, téléchargé par le script)
├── cypher/
│   ├── import.cypher            # Script d'import du dataset
│   └── queries-reference.cypher # Requêtes Cypher de référence
├── scripts/
│   └── init-neo4j.sh            # Script d'initialisation automatique
└── README.md
```

## Requêtes disponibles

Le fichier `cypher/queries-reference.cypher` contient :

- **Recherche** : trouver un film par titre, lister par genre, historique utilisateur
- **Collaborative filtering** : recommandations basées sur les goûts d'utilisateurs similaires
- **Content-based** : recommandations par genres préférés
- **Top films** : classement par note moyenne avec seuil minimum de votes
- **GDS** : projection in-memory, similarité Jaccard, voisins les plus proches

## Arrêter Neo4j

```bash
docker compose -f docker-compose.neo4j.yml down
```

Pour supprimer aussi les données persistées :

```bash
docker compose -f docker-compose.neo4j.yml down -v
```