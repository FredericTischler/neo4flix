package com.neo4flix.movie.repository;

import com.neo4flix.movie.model.GenreEntity;
import org.springframework.data.neo4j.repository.Neo4jRepository;

import java.util.Optional;

public interface GenreRepository extends Neo4jRepository<GenreEntity, Long> {

    Optional<GenreEntity> findByName(String name);
}