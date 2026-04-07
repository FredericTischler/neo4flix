#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_DIR/nginx/ssl"

mkdir -p "$SSL_DIR"

echo "Generating self-signed SSL certificate..."

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/selfsigned.key" \
  -out "$SSL_DIR/selfsigned.crt" \
  -subj "/C=FR/ST=Normandie/L=Rouen/O=Neo4flix/CN=localhost"

echo "SSL certificate generated in $SSL_DIR"