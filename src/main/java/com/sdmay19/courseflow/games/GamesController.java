package com.sdmay19.courseflow.games;

import com.sdmay19.courseflow.User.AppUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
public class GamesController {

    private final GamesService gamesService;

    public GamesController(GamesService gamesService) {
        this.gamesService = gamesService;
    }

    @GetMapping("/daily")
    public DailyGameStateResponse getDailyPuzzle(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return gamesService.getDailyGame(user);
    }

    @PostMapping("/daily/guess")
    public DailyGameGuessResponse submitDailyGuess(
            Authentication auth,
            @RequestBody DailyGameGuessRequest request) {
        AppUser user = (AppUser) auth.getPrincipal();
        return gamesService.submitDailyGuess(user, request);
    }
}
