using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace MemoryGame {
    public partial class LoginWindow : Window {
        private ObservableCollection<UserProfile> _users;
        private List<string> _availablePictures;
        private int _currentPictureIndex = 0;

        public UserProfile SelectedUser { get; private set; }

        public LoginWindow() {
            InitializeComponent();
            LoadPictures(); // Load pictures first to ensure they're available
            LoadUsers();

            // Disable buttons initially
            btnPlay.IsEnabled = false;
            btnDeleteUser.IsEnabled = false;
            btnPrevPicture.IsEnabled = false;
            btnNextPicture.IsEnabled = false;
        }

        private void LoadUsers() {
            // In a real application, you would load users from a file or database
            _users = new ObservableCollection<UserProfile>();

            // Try to load users from file
            try {
                if (File.Exists("users.dat")) {
                    string[] lines = File.ReadAllLines("users.dat");
                    foreach (string line in lines) {
                        string[] parts = line.Split('|');
                        if (parts.Length == 2) {
                            _users.Add(new UserProfile
                            {
                                Username = parts[0],
                                PicturePath = parts[1]
                            });
                        }
                    }
                }

            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading users: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }

            lstUsers.ItemsSource = _users;

            
            if (_users.Count > 0) {
                lstUsers.SelectedIndex = 0;
            }
        }

        private void LoadPictures() {
            _availablePictures = new List<string>();

            try {
                string folderPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "users");

                if (Directory.Exists(folderPath)) {
                    string[] pngFiles = Directory.GetFiles(folderPath, "*.png");

                    foreach (var file in pngFiles) {
                        _availablePictures.Add(new Uri(file).AbsoluteUri);
                    }
                }

                if (_availablePictures.Count == 0) {
                    MessageBox.Show("No pictures found in Resources/users folder.", "Warning",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading pictures: {ex.Message}", "Warning",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }



        private void SaveUsers() {
            try {
                List<string> lines = new List<string>();

                foreach (UserProfile user in _users) {
                    lines.Add($"{user.Username}|{user.PicturePath}");
                }

                File.WriteAllLines("users.dat", lines);
            }
            catch (Exception ex) {
                MessageBox.Show($"Error saving users: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void UpdatePictureDisplay() {
            if (lstUsers.SelectedItem != null && _availablePictures.Count > 0) {
                UserProfile selectedUser = (UserProfile)lstUsers.SelectedItem;

                // Check if the path is null or empty
                if (string.IsNullOrEmpty(selectedUser.PicturePath)) {
                    selectedUser.PicturePath = _availablePictures[0];
                }

                // Find the current picture index
                _currentPictureIndex = _availablePictures.IndexOf(selectedUser.PicturePath);
                if (_currentPictureIndex < 0) _currentPictureIndex = 0;

                try {
                    BitmapImage bitmap = new BitmapImage();
                    bitmap.BeginInit();
                    bitmap.UriSource = new Uri(selectedUser.PicturePath, UriKind.Absolute); // Always use Absolute for pack URIs
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.EndInit();
                    imgUserPicture.Source = bitmap;
                }
                catch (Exception ex) {
                    // If there's an error loading the image, use the default
                    System.Diagnostics.Debug.WriteLine($"Error loading image: {ex.Message}");
                    selectedUser.PicturePath = _availablePictures[0];

                    try {
                        BitmapImage bitmap = new BitmapImage(new Uri(_availablePictures[0], UriKind.Relative));
                        imgUserPicture.Source = bitmap;
                    }
                    catch {
                        // Create an empty bitmap as a last resort
                        imgUserPicture.Source = null;
                    }
                }
            }
        }

        private void lstUsers_SelectionChanged(object sender, SelectionChangedEventArgs e) {
            btnPlay.IsEnabled = lstUsers.SelectedItem != null;
            btnDeleteUser.IsEnabled = lstUsers.SelectedItem != null;
            btnPrevPicture.IsEnabled = lstUsers.SelectedItem != null;
            btnNextPicture.IsEnabled = lstUsers.SelectedItem != null;

            UpdatePictureDisplay();
        }

        private void btnPrevPicture_Click(object sender, RoutedEventArgs e) {
            if (lstUsers.SelectedItem != null && _availablePictures.Count > 0) {
                _currentPictureIndex--;
                if (_currentPictureIndex < 0) _currentPictureIndex = _availablePictures.Count - 1;

                UserProfile selectedUser = (UserProfile)lstUsers.SelectedItem;
                selectedUser.PicturePath = _availablePictures[_currentPictureIndex];

                UpdatePictureDisplay();
                SaveUsers(); // Save the updated picture
            }
        }

        private void btnNextPicture_Click(object sender, RoutedEventArgs e) {
            if (lstUsers.SelectedItem != null && _availablePictures.Count > 0) {
                _currentPictureIndex++;
                if (_currentPictureIndex >= _availablePictures.Count) _currentPictureIndex = 0;

                UserProfile selectedUser = (UserProfile)lstUsers.SelectedItem;
                selectedUser.PicturePath = _availablePictures[_currentPictureIndex];

                UpdatePictureDisplay();
                SaveUsers(); // Save the updated picture
            }
        }

        private void btnNewUser_Click(object sender, RoutedEventArgs e) {
            // Show a dialog to get the new username
            NewUserDialog dialog = new NewUserDialog();
            if (dialog.ShowDialog() == true) {
                string newUsername = dialog.Username;

                // Check if the username already exists
                if (_users.Any(u => u.Username.Equals(newUsername, StringComparison.OrdinalIgnoreCase))) {
                    MessageBox.Show("A user with this name already exists.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Create new user with default picture
                UserProfile newUser = new UserProfile
                {
                    Username = newUsername,
                    PicturePath = _availablePictures[0]
                };

                _users.Add(newUser);
                lstUsers.SelectedItem = newUser;
                SaveUsers();
            }
        }

        private void btnDeleteUser_Click(object sender, RoutedEventArgs e) {
            if (lstUsers.SelectedItem != null) {
                UserProfile selectedUser = (UserProfile)lstUsers.SelectedItem;

                // Confirm deletion
                MessageBoxResult result = MessageBox.Show(
                    $"Are you sure you want to delete the user '{selectedUser.Username}'?",
                    "Confirm Deletion",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (result == MessageBoxResult.Yes) {
                    _users.Remove(selectedUser);
                    SaveUsers();

                    // Disable buttons if no users are left
                    if (_users.Count == 0) {
                        btnPlay.IsEnabled = false;
                        btnDeleteUser.IsEnabled = false;
                        btnPrevPicture.IsEnabled = false;
                        btnNextPicture.IsEnabled = false;
                    }
                }
            }
        }

        private void btnPlay_Click(object sender, RoutedEventArgs e) {
            if (lstUsers.SelectedItem != null) {
                SelectedUser = (UserProfile)lstUsers.SelectedItem;

                try {
                    // Open the main window
                    MainWindow mainWindow = new MainWindow(SelectedUser);
                    this.Hide();

                    mainWindow.Closed += (s, args) =>
                    {
                        // When the main window is closed, show the login screen again
                        this.Show();
                    };

                    mainWindow.Show();
                }
                catch (Exception ex) {
                    MessageBox.Show($"Error starting game: {ex.Message}", "Error",
                                    MessageBoxButton.OK, MessageBoxImage.Error);
                    this.Show(); // Make sure the login window is visible
                }
            }
        }

        private void btnCancel_Click(object sender, RoutedEventArgs e) {
            this.Close();
        }
    }

    public class UserProfile {
        public string Username { get; set; }
        public string PicturePath { get; set; }
    }
}