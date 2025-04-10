using MemoryGame.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;

namespace MemoryGame.Services {
    public class UserManagementService {
        private readonly DataService _dataService;
        private UserProfile _currentUser;
        private readonly string _appDataFolder;
        private readonly string _usersFolder;
        private readonly string _userListPath;

        public UserProfile CurrentUser => _currentUser;

        public UserManagementService() {
            _dataService = new DataService();

            // Set up paths
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

            _userListPath = Path.Combine(_appDataFolder, "userList.json");
        }

        public ObservableCollection<string> GetAllUsernames() {
            List<string> users = _dataService.GetAllUsers();
            return new ObservableCollection<string>(users);
        }

        public List<UserProfile> LoadUsers() {
            var users = new List<UserProfile>();

            try {
                // First try loading from JSON user list
                if (File.Exists(_userListPath)) {
                    string json = File.ReadAllText(_userListPath);
                    users = JsonSerializer.Deserialize<List<UserProfile>>(json);

                    // Ensure all users have profile files
                    foreach (var user in users) {
                        _dataService.CreateUserProfile(user);
                    }

                    return users;
                }

                // If no JSON user list, try directory-based approach
                var usernames = _dataService.GetAllUsers();

                foreach (var username in usernames) {
                    var profile = _dataService.LoadUserProfile(username);
                    if (profile != null) {
                        users.Add(profile);
                    }
                }

                // If users were found in directories, save to JSON list
                if (users.Count > 0) {
                    SaveUsers(users);
                    return users;
                }

                // Finally, try legacy format as fallback
                if (File.Exists("users.dat")) {
                    string[] lines = File.ReadAllLines("users.dat");
                    foreach (string line in lines) {
                        string[] parts = line.Split('|');
                        if (parts.Length == 2) {
                            var user = new UserProfile {
                                Username = parts[0],
                                PicturePath = parts[1]
                            };

                            users.Add(user);

                            // Migrate user to new format
                            _dataService.CreateUserProfile(user);
                        }
                    }

                    // Save migrated users to JSON format
                    if (users.Count > 0) {
                        SaveUsers(users);
                    }
                }
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading users: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }

            return users;
        }

        public bool SaveUsers(IEnumerable<UserProfile> users) {
            try {
                // 1. Save to the central JSON list
                var options = new JsonSerializerOptions { WriteIndented = true };
                string json = JsonSerializer.Serialize(users, options);
                File.WriteAllText(_userListPath, json);

                // 2. Save each individual user profile
                foreach (var user in users) {
                    _dataService.CreateUserProfile(user);
                }

                return true;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error saving users: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public List<string> GetAvailablePictures() {
            var availablePictures = new List<string>();
            try {
                string folderPath = Path.Combine(
                    AppDomain.CurrentDomain.BaseDirectory,
                    "Resources",
                    "users");

                if (Directory.Exists(folderPath)) {
                    string[] pngFiles = Directory.GetFiles(folderPath, "*.png");
                    foreach (var file in pngFiles) {
                        availablePictures.Add(new Uri(file).AbsoluteUri);
                    }
                }
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading user pictures: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }

            return availablePictures;
        }

        public UserProfile SelectUser(string username) {
            if (string.IsNullOrEmpty(username))
                return null;

            UserProfile profile = _dataService.LoadUserProfile(username);

            if (profile != null) {
                _currentUser = profile;
                return profile;
            }

            return null;
        }

        public UserProfile CreateUser(string username, string picturePath = null) {
            try {
                if (string.IsNullOrEmpty(username)) {
                    MessageBox.Show("Username cannot be empty.", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return null;
                }

                // Check if user already exists
                List<string> existingUsers = _dataService.GetAllUsers();
                foreach (var existingUser in existingUsers) {
                    if (existingUser.Equals(username, StringComparison.OrdinalIgnoreCase)) {
                        MessageBox.Show($"User '{username}' already exists.", "Error",
                            MessageBoxButton.OK, MessageBoxImage.Error);
                        return null;
                    }
                }

                var newUser = new UserProfile {
                    Username = username,
                    PicturePath = picturePath
                };

                bool success = _dataService.CreateUserProfile(newUser);

                if (success) {
                    _currentUser = newUser;

                    // Update the central user list
                    var allUsers = LoadUsers();
                    if (!allUsers.Any(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase))) {
                        allUsers.Add(newUser);
                        SaveUsers(allUsers);
                    }

                    return newUser;
                }

                return null;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error creating user: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return null;
            }
        }

        public bool UpdateUserPicture(string picturePath) {
            if (_currentUser == null) {
                MessageBox.Show("No active user selected.", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }

            _currentUser.PicturePath = picturePath;

            // Update individual profile
            bool success = _dataService.CreateUserProfile(_currentUser);

            if (success) {
                // Update in the central user list
                var allUsers = LoadUsers();
                var userToUpdate = allUsers.FirstOrDefault(u =>
                    u.Username.Equals(_currentUser.Username, StringComparison.OrdinalIgnoreCase));

                if (userToUpdate != null) {
                    userToUpdate.PicturePath = picturePath;
                    SaveUsers(allUsers);
                }
            }

            return success;
        }

        public bool DeleteUser(string username) {
            try {
                if (string.IsNullOrEmpty(username))
                    return false;

                // 1. Delete user directory
                string sanitizedUsername = SanitizeUsername(username);
                string userFolder = Path.Combine(_usersFolder, sanitizedUsername);

                bool success = false;

                if (Directory.Exists(userFolder)) {
                    Directory.Delete(userFolder, true);
                    success = true;
                }

                // 2. Remove from central user list
                var allUsers = LoadUsers();
                var userToRemove = allUsers.FirstOrDefault(u =>
                    u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));

                if (userToRemove != null) {
                    allUsers.Remove(userToRemove);
                    SaveUsers(allUsers);
                    success = true;
                }

                return success;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error deleting user: {ex.Message}", "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public bool HasSavedGame(string username) {
            if (string.IsNullOrEmpty(username))
                return false;

            try {
                // Create a temporary game model to check if loading would succeed
                var tempModel = new GameModel { CurrentUser = new UserProfile { Username = username } };
                return _dataService.LoadGameState(tempModel);
            }
            catch {
                return false;
            }
        }

        private string SanitizeUsername(string username) {
            foreach (char c in Path.GetInvalidFileNameChars()) {
                username = username.Replace(c, '_');
            }
            return username;
        }
    }
}