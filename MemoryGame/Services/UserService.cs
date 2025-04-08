using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using MemoryGame.Models;

namespace MemoryGame.Services {
    public class ScoreRecord {
        public string Username { get; set; }
        public DateTime Date { get; set; }
        public string Difficulty { get; set; }
        public int Score { get; set; }
        public TimeSpan Time { get; set; }
    }
    public class UserService {
        private const string UserDataFile = "users.dat";

        public List<UserProfile> LoadUsers() {
            var users = new List<UserProfile>();

            try {
                if (File.Exists(UserDataFile)) {
                    string[] lines = File.ReadAllLines(UserDataFile);
                    foreach (string line in lines) {
                        string[] parts = line.Split('|');
                        if (parts.Length == 2) {
                            users.Add(new UserProfile
                            {
                                Username = parts[0],
                                PicturePath = parts[1]
                            });
                        }
                    }
                }
            }
            catch (Exception) {
                // Log exception and handle gracefully
                // Return empty list if there's an error
            }

            return users;
        }

        public bool SaveUsers(IEnumerable<UserProfile> users) {
            try {
                List<string> lines = users
                    .Select(user => $"{user.Username}|{user.PicturePath}")
                    .ToList();

                File.WriteAllLines(UserDataFile, lines);
                return true;
            }
            catch (Exception) {
                // Log exception and handle gracefully
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
            catch (Exception) {
                // Log exception and handle gracefully
            }

            return availablePictures;
        }
    }
}