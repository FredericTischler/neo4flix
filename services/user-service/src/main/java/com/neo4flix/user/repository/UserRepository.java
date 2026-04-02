package com.neo4flix.user.repository;

import com.neo4flix.user.model.UserEntity;
import org.springframework.data.neo4j.repository.Neo4jRepository;

import java.util.Optional;

public interface UserRepository extends Neo4jRepository<UserEntity, Long> {

    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByUserId(String userId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}