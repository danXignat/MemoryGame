using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;

namespace MemoryGame.Services {
    public class ScoreService {
        private readonly string _appDataFolder;
        private readonly string _scoresPath;
        private List<ScoreRecord> _scores;

        public ScoreService() {
            _appDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "MemoryGame");

            if (!Directory.Exists(_appDataFolder)) {
                Directory.CreateDirectory(_appDataFolder);
            }

            _scoresPath = Path.Combine(_appDataFolder, "scores.json");
            LoadScores();
        }

        private void LoadScores() {
            try {
                if (File.Exists(_scoresPath)) {
                    string json = File.ReadAllText(_scoresPath);
                    _scores = JsonSerializer.Deserialize<List<ScoreRecord>>(json);
                }
                else {
                    _scores = new List<ScoreRecord>();
                }
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading scores: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                _scores = new List<ScoreRecord>();
            }
        }

        private void SaveScores() {
            try {
                string json = JsonSerializer.Serialize(_scores, new JsonSerializerOptions {
                    WriteIndented = true
                });
                File.WriteAllText(_scoresPath, json);
            }
            catch (Exception ex) {
                MessageBox.Show($"Error saving scores: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        public void RecordGameStarted(string username, string difficulty) {
            if (string.IsNullOrEmpty(username)) return;

            try {
                var record = _scores.FirstOrDefault(s => s.PlayerName.Equals(username, StringComparison.OrdinalIgnoreCase));

                if (record == null) {
                    record = new ScoreRecord {
                        PlayerName = username,
                        Score = 0,
                        GamesPlayed = 1,
                        GamesCompleted = 0
                    };
                    _scores.Add(record);
                }
                else {
                    record.GamesPlayed++;
                }

                SaveScores();
            }
            catch (Exception ex) {
                MessageBox.Show($"Error recording game start: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        public void RecordGameCompleted(string username, int score) {
            if (string.IsNullOrEmpty(username)) return;

            try {
                var record = _scores.FirstOrDefault(s => s.PlayerName.Equals(username, StringComparison.OrdinalIgnoreCase));

                if (record == null) {
                    // This shouldn't happen as RecordGameStarted should be called first,
                    // but just in case:
                    record = new ScoreRecord {
                        PlayerName = username,
                        Score = score,
                        GamesPlayed = 1,
                        GamesCompleted = 1
                    };
                    _scores.Add(record);
                }
                else {
                    record.GamesCompleted++;
                    record.Score = Math.Max(record.Score, score); // Keep highest score
                }

                SaveScores();
            }
            catch (Exception ex) {
                MessageBox.Show($"Error recording game completion: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        public List<ScoreRecord> GetHighScores() {
            // Create a copy of scores to avoid modifying the original
            var scoresList = _scores.ToList();

            // Sort by score (descending)
            scoresList.Sort((a, b) => b.Score.CompareTo(a.Score));

            // Add rank to each score
            int rank = 1;
            foreach (var score in scoresList) {
                score.Rank = rank++;
            }

            return scoresList;
        }

        public void ResetScores() {
            _scores.Clear();
            SaveScores();
        }
    }
}