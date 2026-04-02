package com.neo4flix.user.exception;

import java.util.List;

public class PasswordValidationException extends RuntimeException {

    private final List<String> violations;

    public PasswordValidationException(List<String> violations) {
        super("Password does not meet requirements: " + String.join("; ", violations));
        this.violations = violations;
    }

    public List<String> getViolations() {
        return violations;
    }
}