using System;
using System.Windows;
using MemoryGame.ViewModels;

namespace MemoryGame {
    public partial class MainWindow : Window {
        private UserProfile _currentUser;

        public MainWindow(UserProfile user) {
            InitializeComponent();

            // Make sure user isn't null
            _currentUser = user ?? new UserProfile { Username = "Guest" };

            // Update the window title to show the current user
            this.Title = $"Memory Game - {_currentUser.Username}";

            try {
                // Set the DataContext to the MainViewModel
                DataContext = new MainViewModel();
            }
            catch (Exception ex) {
                MessageBox.Show($"Error initializing main window: {ex.Message}",
                    "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }


        // Rest of your MainWindow code...
    }
}