using System;

namespace MemoryGame.Services {
    public class ScoreRecord {
        public string PlayerName { get; set; }  // Changed from Username to PlayerName
        public int Score { get; set; }
        public int GamesPlayed { get; set; }
        public int GamesCompleted { get; set; }
        public int Rank { get; set; } // For display purposes
    }
}