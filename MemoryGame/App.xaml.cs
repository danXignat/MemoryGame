using System;
using System.Windows;
using MemoryGame.ViewModels;
using MemoryGame.Models;

namespace MemoryGame {
    public partial class App : Application {
        public MainViewModel MainViewModel { get; private set; }
        private MainWindow _mainWindow;

        protected override void OnStartup(StartupEventArgs e) {
            base.OnStartup(e);

            // Initialize main view model
            MainViewModel = new MainViewModel();

            // Subscribe to login request event
            MainViewModel.LoginRequested += OnLoginRequested;
            MainViewModel.GameClosed += OnGameClosed;

            // Start with showing login window
            ShowLoginWindow();  
        }

        // Method to show login window
        public void ShowLoginWindow() {
            LoginWindow loginWindow = new LoginWindow(MainViewModel);
            bool? loginResult = loginWindow.ShowDialog();

            // Only show the main window if login was successful
            if (loginResult == true && MainViewModel.CurrentUser != null) {
                ShowMainWindow();
            }
            else if (loginWindow.IsClosingCompletely) {
                // If X button on login was clicked, shut down
                Shutdown();
            }
            // If cancel was pressed, do nothing (window will close but app stays running)
        }

        // Method to show main window
        private void ShowMainWindow() {
            // Create main window if it doesn't exist
            if (_mainWindow == null) {
                _mainWindow = new MainWindow(MainViewModel);
                _mainWindow.Closed += MainWindow_Closed;
            }

            _mainWindow.Show();
            _mainWindow.Activate(); // Make sure it's in front
        }

        private void MainWindow_Closed(object sender, EventArgs e) {
            _mainWindow = null; // Clear reference

            // When main window is closed, show login window again
            ShowLoginWindow();
        }

        private void OnLoginRequested(object sender, EventArgs e) {
            ShowLoginWindow();
        }

        private void OnGameClosed(object sender, EventArgs e) {
            // If the main window exists, close it
            if (_mainWindow != null) {
                _mainWindow.Close();
                _mainWindow = null;
            }

            // Show login window
            ShowLoginWindow();
        }
    }
}