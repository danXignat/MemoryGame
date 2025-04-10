using MemoryGame.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Windows;

namespace MemoryGame.Services {
    public class DataService {
        private readonly string _appDataFolder;
        private readonly string _usersFolder;
        private readonly string _customSettingsPath;

        public DataService() {
            _appDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "MemoryGame");

            if (!Directory.Exists(_appDataFolder)) {
                Directory.CreateDirectory(_appDataFolder);
            }

            _usersFolder = Path.Combine(_appDataFolder, "Users");
            if (!Directory.Exists(_usersFolder)) {
                Directory.CreateDirectory(_usersFolder);
            }

            _customSettingsPath = Path.Combine(_appDataFolder, "customSettings.json");
        }

        public bool SaveGameState(GameModel gameModel) {
            try {
                if (gameModel.CurrentUser == null || string.IsNullOrEmpty(gameModel.CurrentUser.Username)) {
                    MessageBox.Show("Cannot save game: No active user.", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return false;
                }

                var gameState = new GameState {
                    Score = gameModel.Score,
                    Attempts = gameModel.Attempts,
                    GameTime = gameModel.GameTime,
                    SelectedCategory = gameModel.SelectedCategory,
                    SelectedDifficulty = gameModel.SelectedDifficulty,
                    GridRows = gameModel.GridRows,
                    GridColumns = gameModel.GridColumns,
                    Cards = gameModel.Cards,
                    MaxGameTime = gameModel.MaxGameTime,
                    RemainingGameTime = gameModel.RemainingGameTime
                };

                string username = SanitizeUsername(gameModel.CurrentUser.Username);
                string userFolder = Path.Combine(_usersFolder, username);
                if (!Directory.Exists(userFolder)) {
                    Directory.CreateDirectory(userFolder);
                }

                SaveUserProfile(gameModel.CurrentUser, userFolder);

                string gameStatePath = Path.Combine(userFolder, "savedgame.json");
                string json = JsonSerializer.Serialize(gameState, new JsonSerializerOptions {
                    WriteIndented = true
                });

                File.WriteAllText(gameStatePath, json);
                return true;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error saving game state: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        private bool SaveUserProfile(UserProfile userProfile, string userFolder) {
            try {
                string profilePath = Path.Combine(userFolder, "profile.json");
                string json = JsonSerializer.Serialize(userProfile, new JsonSerializerOptions {
                    WriteIndented = true
                });

                File.WriteAllText(profilePath, json);
                return true;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error saving user profile: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public bool LoadGameState(GameModel gameModel) {
            try {
                if (gameModel.CurrentUser == null || string.IsNullOrEmpty(gameModel.CurrentUser.Username)) {
                    MessageBox.Show("Cannot load game: No active user.", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return false;
                }

                string username = SanitizeUsername(gameModel.CurrentUser.Username);
                string userFolder = Path.Combine(_usersFolder, username);

                if (!Directory.Exists(userFolder)) {
                    MessageBox.Show($"No saved data found for user '{gameModel.CurrentUser.Username}'.",
                        "Information", MessageBoxButton.OK, MessageBoxImage.Information);
                    return false;
                }

                string gameStatePath = Path.Combine(userFolder, "savedgame.json");

                if (!File.Exists(gameStatePath)) {
                    MessageBox.Show($"No saved game found for user '{gameModel.CurrentUser.Username}'.",
                        "Information", MessageBoxButton.OK, MessageBoxImage.Information);
                    return false;
                }

                string json = File.ReadAllText(gameStatePath);
                var gameState = JsonSerializer.Deserialize<GameState>(json);

                if (gameState != null) {
                    gameModel.Score = gameState.Score;
                    gameModel.Attempts = gameState.Attempts;
                    gameModel.GameTime = gameState.GameTime;
                    gameModel.SelectedCategory = gameState.SelectedCategory;
                    gameModel.SelectedDifficulty = gameState.SelectedDifficulty;
                    gameModel.GridRows = gameState.GridRows;
                    gameModel.GridColumns = gameState.GridColumns;
                    gameModel.MaxGameTime = gameState.MaxGameTime;
                    gameModel.RemainingGameTime = gameState.RemainingGameTime;

                    gameModel.Cards.Clear();
                    if (gameState.Cards != null) {
                        foreach (var card in gameState.Cards) {
                            gameModel.Cards.Add(card);
                        }
                    }

                    return true;
                }

                return false;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading game state: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public List<string> GetAllUsers() {
            List<string> users = new List<string>();

            try {
                if (Directory.Exists(_usersFolder)) {
                    string[] userDirectories = Directory.GetDirectories(_usersFolder);

                    foreach (string userDir in userDirectories) {
                        string profilePath = Path.Combine(userDir, "profile.json");
                        if (File.Exists(profilePath)) {
                            users.Add(Path.GetFileName(userDir));
                        }
                    }
                }
            }
            catch (Exception ex) {
                MessageBox.Show($"Error retrieving users: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }

            return users;
        }

        public UserProfile LoadUserProfile(string username) {
            try {
                string sanitizedUsername = SanitizeUsername(username);
                string userFolder = Path.Combine(_usersFolder, sanitizedUsername);
                string profilePath = Path.Combine(userFolder, "profile.json");

                if (File.Exists(profilePath)) {
                    string json = File.ReadAllText(profilePath);
                    return JsonSerializer.Deserialize<UserProfile>(json);
                }
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading user profile: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }

            return null;
        }

        public bool CreateUserProfile(UserProfile userProfile) {
            try {
                if (userProfile == null || string.IsNullOrEmpty(userProfile.Username)) {
                    return false;
                }

                string sanitizedUsername = SanitizeUsername(userProfile.Username);
                string userFolder = Path.Combine(_usersFolder, sanitizedUsername);

                if (!Directory.Exists(userFolder)) {
                    Directory.CreateDirectory(userFolder);
                }

                return SaveUserProfile(userProfile, userFolder);
            }
            catch (Exception ex) {
                MessageBox.Show($"Error creating user profile: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        private string SanitizeUsername(string username) {
            foreach (char c in Path.GetInvalidFileNameChars()) {
                username = username.Replace(c, '_');
            }
            return username;
        }

        public bool SaveCustomSettings(List<string> customSettings) {
            try {
                var settings = new CustomSettings {
                    DifficultyLevels = customSettings
                };

                string json = JsonSerializer.Serialize(settings, new JsonSerializerOptions {
                    WriteIndented = true
                });

                File.WriteAllText(_customSettingsPath, json);
                return true;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error saving custom settings: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public List<string> LoadCustomSettings() {
            try {
                if (!File.Exists(_customSettingsPath)) {
                    return new List<string>();
                }

                string json = File.ReadAllText(_customSettingsPath);
                var settings = JsonSerializer.Deserialize<CustomSettings>(json);

                return settings?.DifficultyLevels ?? new List<string>();
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading custom settings: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return new List<string>();
            }
        }
    }

    public class GameState {
        public int Score { get; set; }
        public int Attempts { get; set; }
        public string GameTime { get; set; }
        public string SelectedCategory { get; set; }
        public string SelectedDifficulty { get; set; }
        public int GridRows { get; set; }
        public int GridColumns { get; set; }
        public List<Card> Cards { get; set; }
        public int MaxGameTime { get; set; }
        public int RemainingGameTime { get; set; }
    }

    public class CustomSettings {
        public List<string> DifficultyLevels { get; set; } = new List<string>();
    }
}