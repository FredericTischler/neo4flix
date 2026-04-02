package com.neo4flix.rating.controller;

import com.neo4flix.rating.dto.PageResponse;
import com.neo4flix.rating.dto.WatchlistExistsResponse;
import com.neo4flix.rating.dto.WatchlistResponse;
import com.neo4flix.rating.service.WatchlistService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @PostMapping("/{movieId}")
    public ResponseEntity<WatchlistResponse> addToWatchlist(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String movieId) {
        WatchlistResponse response = watchlistService.addToWatchlist(userId, movieId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<WatchlistResponse>> getWatchlist(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(watchlistService.getWatchlist(userId, page, size));
    }

    @DeleteMapping("/{movieId}")
    public ResponseEntity<Void> removeFromWatchlist(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String movieId) {
        watchlistService.removeFromWatchlist(userId, movieId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{movieId}/exists")
    public ResponseEntity<WatchlistExistsResponse> existsInWatchlist(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String movieId) {
        return ResponseEntity.ok(watchlistService.existsInWatchlist(userId, movieId));
    }
}