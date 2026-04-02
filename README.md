# Neo4flix

Moteur de recommandation de films basé sur Neo4j, Spring Boot (microservices) et Angular.

## Prérequis

- Docker et Docker Compose
- `curl` et `unzip` (pour le téléchargement du dataset)

## Démarrage rapide

### 1. Lancer Neo4j

```bash
docker compose up neo4j -d
```

### 2. Importer les données MovieLens

Le script télécharge automatiquement le dataset, attend que Neo4j soit prêt, puis lance l'import :

```bash
./scripts/init-neo4j.sh
```

L'import crée :
- **Noeuds** : `User`, `Movie` (avec titre et année), `Genre`
- **Relations** : `RATED` (score + timestamp), `IN_GENRE`

### 3. Explorer les données

Ouvrir le Neo4j Browser : [http://localhost:7474](http://localhost:7474)

- **Identifiants** : `neo4j` / `neo4flix2024`
- **Protocole Bolt** : `bolt://localhost:7687`

Les requêtes de référence sont dans `cypher/queries-reference.cypher`.

## Architecture

```
neo4flix/
├── docker-compose.yml              # Compose projet (Neo4j actif, services commentés)
├── docker-compose.neo4j.yml        # Compose isolé Neo4j (phase 0)
├── data/movielens/                  # Dataset MovieLens (gitignored)
├── cypher/
│   ├── import.cypher                # Import du dataset
│   └── queries-reference.cypher     # Requêtes Cypher de référence
├── scripts/
│   └── init-neo4j.sh                # Initialisation automatique
├── services/
│   ├── api-gateway/                 # Gateway Spring Cloud (port 8080)
│   ├── user-service/                # Gestion utilisateurs (port 8081)
│   ├── movie-service/               # Catalogue films (port 8082)
│   ├── rating-service/              # Notes et avis (port 8083)
│   └── recommendation-service/      # Recommandations (port 8084)
├── frontend/                        # Angular
└── README.md
```

## Services

| Service | Port | Description |
|---|---|---|
| Neo4j Browser | 7474 | Interface web Neo4j |
| Neo4j Bolt | 7687 | Protocole de connexion |
| API Gateway | 8080 | Point d'entrée unique |
| User Service | 8081 | Gestion des utilisateurs |
| Movie Service | 8082 | Catalogue de films |
| Rating Service | 8083 | Notes et avis |
| Recommendation Service | 8084 | Moteur de recommandation |

## Arrêter le projet

```bash
docker compose down
```

Pour supprimer aussi les données persistées :

```bash
docker compose down -v
```