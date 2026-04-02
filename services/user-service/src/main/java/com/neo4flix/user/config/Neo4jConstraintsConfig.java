package com.neo4flix.user.config;

import jakarta.annotation.PostConstruct;
import org.neo4j.driver.Driver;
import org.springframework.stereotype.Component;

@Component
public class Neo4jConstraintsConfig {

    private final Driver driver;

    public Neo4jConstraintsConfig(Driver driver) {
        this.driver = driver;
    }

    @PostConstruct
    public void createConstraints() {
        try (var session = driver.session()) {
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE");
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE");
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE");
        }
    }
}