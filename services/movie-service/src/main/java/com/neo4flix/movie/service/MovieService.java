package com.neo4flix.movie.service;

import com.neo4flix.movie.dto.*;
import com.neo4flix.movie.exception.GenreNotFoundException;
import com.neo4flix.movie.exception.MovieNotFoundException;
import com.neo4flix.movie.model.GenreEntity;
import com.neo4flix.movie.model.MovieEntity;
import com.neo4flix.movie.repository.GenreRepository;
import com.neo4flix.movie.repository.MovieRepository;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Values;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MovieService {

    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final Driver driver;

    public MovieService(MovieRepository movieRepository, GenreRepository genreRepository, Driver driver) {
        this.movieRepository = movieRepository;
        this.genreRepository = genreRepository;
        this.driver = driver;
    }

    public PageResponse<MovieResponse> listMovies(int page, int size) {
        Page<MovieEntity> moviePage = movieRepository.findAll(
                PageRequest.of(page, size, Sort.by("title")));

        Map<String, double[]> ratings = fetchRatings(
                moviePage.getContent().stream().map(MovieEntity::getMovieId).toList());

        List<MovieResponse> content = moviePage.getContent().stream()
                .map(m -> toMovieResponse(m, ratings.getOrDefault(m.getMovieId(), new double[]{0, 0})))
                .toList();

        return new PageResponse<>(content, moviePage.getTotalElements(),
                moviePage.getTotalPages(), page);
    }

    public MovieDetailResponse getMovie(String movieId) {
        MovieEntity movie = movieRepository.findByMovieId(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));

        double[] rating = fetchRating(movieId);

        return new MovieDetailResponse(
                movie.getMovieId(),
                movie.getTitle(),
                movie.getYear(),
                movie.getGenres().stream().map(GenreEntity::getName).toList(),
                rating[1] > 0 ? Math.round(rating[0] * 100.0) / 100.0 : null,
                (long) rating[1]
        );
    }

    public MovieResponse createMovie(CreateMovieRequest request) {
        MovieEntity movie = new MovieEntity();
        movie.setMovieId(UUID.randomUUID().toString());
        movie.setTitle(request.title());
        movie.setYear(request.year());
        movie.setGenres(resolveGenres(request.genres()));

        movieRepository.save(movie);

        return toMovieResponse(movie, new double[]{0, 0});
    }

    public MovieResponse updateMovie(String movieId, UpdateMovieRequest request) {
        MovieEntity movie = movieRepository.findByMovieId(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));

        if (request.title() != null && !request.title().isBlank()) {
            movie.setTitle(request.title());
        }
        if (request.year() != null) {
            movie.setYear(request.year());
        }
        if (request.genres() != null) {
            movie.setGenres(resolveGenres(request.genres()));
        }

        movieRepository.save(movie);

        double[] rating = fetchRating(movieId);
        return toMovieResponse(movie, rating);
    }

    public void deleteMovie(String movieId) {
        MovieEntity movie = movieRepository.findByMovieId(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));
        movieRepository.delete(movie);
    }

    public List<GenreResponse> listGenres() {
        return genreRepository.findAll(Sort.by("name")).stream()
                .map(g -> new GenreResponse(g.getName()))
                .toList();
    }

    public PageResponse<MovieResponse> getMoviesByGenre(String genreName, int page, int size) {
        genreRepository.findByName(genreName)
                .orElseThrow(() -> new GenreNotFoundException(genreName));

        long total = movieRepository.countByGenre(genreName);
        List<MovieEntity> movies = movieRepository.findByGenre(genreName, (long) page * size, size);

        Map<String, double[]> ratings = fetchRatings(
                movies.stream().map(MovieEntity::getMovieId).toList());

        List<MovieResponse> content = movies.stream()
                .map(m -> toMovieResponse(m, ratings.getOrDefault(m.getMovieId(), new double[]{0, 0})))
                .toList();

        int totalPages = (int) Math.ceil((double) total / size);
        return new PageResponse<>(content, total, totalPages, page);
    }

    public PageResponse<MovieResponse> searchMovies(String title, String genre,
                                                     Integer yearFrom, Integer yearTo,
                                                     Double minRating, int page, int size) {
        StringBuilder cypher = new StringBuilder("MATCH (m:Movie) ");
        Map<String, Object> params = new HashMap<>();

        if (genre != null && !genre.isBlank()) {
            cypher.append("MATCH (m)-[:IN_GENRE]->(g:Genre {name: $genre}) ");
            params.put("genre", genre);
        }

        List<String> conditions = new ArrayList<>();
        if (title != null && !title.isBlank()) {
            conditions.add("toLower(m.title) CONTAINS toLower($title)");
            params.put("title", title);
        }
        if (yearFrom != null) {
            conditions.add("m.year >= $yearFrom");
            params.put("yearFrom", yearFrom);
        }
        if (yearTo != null) {
            conditions.add("m.year <= $yearTo");
            params.put("yearTo", yearTo);
        }

        if (!conditions.isEmpty()) {
            cypher.append("WHERE ").append(String.join(" AND ", conditions)).append(" ");
        }

        // Rating filter requires subquery
        String ratingFilter = "";
        if (minRating != null) {
            ratingFilter = "WHERE avgRating >= $minRating ";
            params.put("minRating", minRating);
        }

        // Count query
        String countCypher = cypher + "OPTIONAL MATCH (m)<-[r:RATED]-() "
                + "WITH m, avg(r.score) AS avgRating " + ratingFilter + "RETURN count(m)";

        // Data query
        params.put("skip", (long) page * size);
        params.put("limit", size);
        String dataCypher = cypher + "OPTIONAL MATCH (m)<-[r:RATED]-() "
                + "WITH m, avg(r.score) AS avgRating, count(r) AS voteCount " + ratingFilter
                + "OPTIONAL MATCH (m)-[:IN_GENRE]->(genre:Genre) "
                + "RETURN m.movieId AS movieId, m.title AS title, m.year AS year, "
                + "collect(genre.name) AS genres, avgRating, voteCount "
                + "ORDER BY m.title SKIP $skip LIMIT $limit";

        long total;
        List<MovieResponse> content;

        try (var session = driver.session()) {
            total = session.run(countCypher, Values.value(params))
                    .single().get(0).asLong();

            content = session.run(dataCypher, Values.value(params)).list(record ->
                    new MovieResponse(
                            record.get("movieId").asString(),
                            record.get("title").asString(),
                            record.get("year").asInt(),
                            record.get("genres").asList(org.neo4j.driver.Value::asString),
                            record.get("avgRating").isNull() ? null
                                    : Math.round(record.get("avgRating").asDouble() * 100.0) / 100.0,
                            record.get("voteCount").asLong()
                    ));
        }

        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return new PageResponse<>(content, total, totalPages, page);
    }

    private List<GenreEntity> resolveGenres(List<String> genreNames) {
        return genreNames.stream().map(name -> {
            return genreRepository.findByName(name).orElseGet(() -> {
                GenreEntity g = new GenreEntity();
                g.setName(name);
                return genreRepository.save(g);
            });
        }).toList();
    }

    private double[] fetchRating(String movieId) {
        try (var session = driver.session()) {
            Record record = session.run(
                    "MATCH (m:Movie {movieId: $movieId}) " +
                            "OPTIONAL MATCH (m)<-[r:RATED]-() " +
                            "RETURN avg(r.score) AS avg, count(r) AS cnt",
                    Values.parameters("movieId", movieId)).single();
            double avg = record.get("avg").isNull() ? 0 : record.get("avg").asDouble();
            long cnt = record.get("cnt").asLong();
            return new double[]{avg, cnt};
        }
    }

    private Map<String, double[]> fetchRatings(List<String> movieIds) {
        if (movieIds.isEmpty()) return Map.of();
        Map<String, double[]> result = new HashMap<>();
        try (var session = driver.session()) {
            session.run(
                    "MATCH (m:Movie) WHERE m.movieId IN $ids " +
                            "OPTIONAL MATCH (m)<-[r:RATED]-() " +
                            "RETURN m.movieId AS movieId, avg(r.score) AS avg, count(r) AS cnt",
                    Values.parameters("ids", movieIds)).forEachRemaining(record -> {
                String id = record.get("movieId").asString();
                double avg = record.get("avg").isNull() ? 0 : record.get("avg").asDouble();
                long cnt = record.get("cnt").asLong();
                result.put(id, new double[]{avg, cnt});
            });
        }
        return result;
    }

    private MovieResponse toMovieResponse(MovieEntity movie, double[] rating) {
        return new MovieResponse(
                movie.getMovieId(),
                movie.getTitle(),
                movie.getYear(),
                movie.getGenres().stream().map(GenreEntity::getName).toList(),
                rating[1] > 0 ? Math.round(rating[0] * 100.0) / 100.0 : null,
                (long) rating[1]
        );
    }
}