#!/usr/bin/env bash
set -euo pipefail

NEO4J_HOST="${NEO4J_HOST:-localhost}"
NEO4J_PORT="${NEO4J_PORT:-7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASS="${NEO4J_PASS:-neo4flix2024}"
CONTAINER="${NEO4J_CONTAINER:-neo4flix-neo4j}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data/movielens"
IMPORT_FILE="$PROJECT_DIR/cypher/import.cypher"

# ──────────────────────────────────────────────
# 1. Télécharger le dataset MovieLens si absent
# ──────────────────────────────────────────────
if [ ! -f "$DATA_DIR/movies.csv" ]; then
  echo ">> Téléchargement du dataset MovieLens ml-latest-small..."
  mkdir -p "$DATA_DIR"
  TMP_ZIP=$(mktemp /tmp/movielens-XXXXXX.zip)
  curl -fSL "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip" -o "$TMP_ZIP"
  unzip -jo "$TMP_ZIP" 'ml-latest-small/*' -d "$DATA_DIR"
  rm -f "$TMP_ZIP"
  echo ">> Dataset extrait dans $DATA_DIR"
else
  echo ">> Dataset MovieLens déjà présent."
fi

# ──────────────────────────────────────────────
# 2. Attendre que Neo4j soit prêt
# ──────────────────────────────────────────────
echo ">> Attente de Neo4j sur $NEO4J_HOST:$NEO4J_PORT..."
MAX_WAIT=60
WAITED=0
until docker exec "$CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASS" "RETURN 1" >/dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "ERREUR : Neo4j n'est pas prêt après ${MAX_WAIT}s." >&2
    exit 1
  fi
done
echo ">> Neo4j est prêt."

# ──────────────────────────────────────────────
# 3. Exécuter le script d'import
# ──────────────────────────────────────────────
echo ">> Import des données MovieLens..."
docker exec -i "$CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASS" < "$IMPORT_FILE"
echo ">> Import terminé."

# ──────────────────────────────────────────────
# 4. Résumé
# ──────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Résumé de l'import Neo4flix"
echo "========================================="

docker exec "$CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASS" --format plain \
  "MATCH (u:User) RETURN 'Users' AS label, count(u) AS count
   UNION ALL
   MATCH (m:Movie) RETURN 'Movies' AS label, count(m) AS count
   UNION ALL
   MATCH (g:Genre) RETURN 'Genres' AS label, count(g) AS count
   UNION ALL
   MATCH ()-[r:RATED]->() RETURN 'RATED relations' AS label, count(r) AS count
   UNION ALL
   MATCH ()-[r:IN_GENRE]->() RETURN 'IN_GENRE relations' AS label, count(r) AS count;"

echo "========================================="
echo ">> Neo4j Browser : http://localhost:7474"
echo ">> Bolt          : bolt://localhost:7687"
echo "========================================="