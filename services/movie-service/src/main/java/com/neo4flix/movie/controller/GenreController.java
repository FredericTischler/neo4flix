package com.neo4flix.movie.controller;

import com.neo4flix.movie.dto.GenreResponse;
import com.neo4flix.movie.dto.MovieResponse;
import com.neo4flix.movie.dto.PageResponse;
import com.neo4flix.movie.service.MovieService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/genres")
public class GenreController {

    private final MovieService movieService;

    public GenreController(MovieService movieService) {
        this.movieService = movieService;
    }

    @GetMapping
    public ResponseEntity<List<GenreResponse>> listGenres() {
        return ResponseEntity.ok(movieService.listGenres());
    }

    @GetMapping("/{name}/movies")
    public ResponseEntity<PageResponse<MovieResponse>> getMoviesByGenre(
            @PathVariable String name,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(movieService.getMoviesByGenre(name, page, size));
    }
}