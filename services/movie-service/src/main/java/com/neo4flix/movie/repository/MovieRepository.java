package com.neo4flix.movie.repository;

import com.neo4flix.movie.model.MovieEntity;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;

import java.util.List;
import java.util.Optional;

public interface MovieRepository extends Neo4jRepository<MovieEntity, Long> {

    Optional<MovieEntity> findByMovieId(String movieId);

    @Query("""
            MATCH (m:Movie)-[:IN_GENRE]->(g:Genre {name: $genre})
            RETURN m, collect(g) AS genres
            ORDER BY m.title
            SKIP $skip LIMIT $limit
            """)
    List<MovieEntity> findByGenre(String genre, long skip, int limit);

    @Query("""
            MATCH (m:Movie)-[:IN_GENRE]->(g:Genre {name: $genre})
            RETURN count(m)
            """)
    long countByGenre(String genre);
}