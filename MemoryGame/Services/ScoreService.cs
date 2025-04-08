using MemoryGame.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace MemoryGame.Services {
    public static class ScoreService {
        // In a real application, this would be stored in a database
        private static readonly List<ScoreRecord> _scores = new List<ScoreRecord>
        {
            new ScoreRecord { Username = "Player1", Date = DateTime.Now.AddDays(-2), Difficulty = "Easy", Score = 800, Time = TimeSpan.FromSeconds(60) },
            new ScoreRecord { Username = "Player1", Date = DateTime.Now.AddDays(-1), Difficulty = "Medium", Score = 1200, Time = TimeSpan.FromSeconds(120) },
            new ScoreRecord { Username = "Player1", Date = DateTime.Now, Difficulty = "Hard", Score = 1800, Time = TimeSpan.FromSeconds(180) },
            new ScoreRecord { Username = "Player2", Date = DateTime.Now.AddDays(-3), Difficulty = "Easy", Score = 750, Time = TimeSpan.FromSeconds(65) },
            new ScoreRecord { Username = "Player2", Date = DateTime.Now.AddDays(-1), Difficulty = "Hard", Score = 2000, Time = TimeSpan.FromSeconds(160) }
        };

        public static IEnumerable<ScoreRecord> GetAllScores() {
            return _scores.OrderByDescending(s => s.Score);
        }

        public static IEnumerable<ScoreRecord> GetScoresForUser(string username) {
            return _scores
                .Where(s => s.Username.Equals(username, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(s => s.Date);
        }

        public static void AddScore(ScoreRecord score) {
            _scores.Add(score);
        }
    }
}