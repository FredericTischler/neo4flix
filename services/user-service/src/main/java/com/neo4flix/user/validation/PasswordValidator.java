package com.neo4flix.user.validation;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class PasswordValidator {

    public List<String> validate(String password) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.length() < 8) {
            errors.add("Password must be at least 8 characters long");
        }
        if (password == null || !password.matches(".*[A-Z].*")) {
            errors.add("Password must contain at least one uppercase letter");
        }
        if (password == null || !password.matches(".*[a-z].*")) {
            errors.add("Password must contain at least one lowercase letter");
        }
        if (password == null || !password.matches(".*\\d.*")) {
            errors.add("Password must contain at least one digit");
        }
        if (password == null || !password.matches(".*[^a-zA-Z0-9].*")) {
            errors.add("Password must contain at least one special character");
        }

        return errors;
    }
}