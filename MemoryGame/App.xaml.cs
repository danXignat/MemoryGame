using System;
using System.Windows;
using MemoryGame.ViewModels;
using MemoryGame.Models;

namespace MemoryGame {
    public partial class App : Application {
        public MainViewModel MainViewModel { get; private set; }
        private MainWindow _mainWindow;
        private LoginWindow _loginWindow;

        protected override void OnStartup(StartupEventArgs e) {
            base.OnStartup(e);

            // Create and set up the MainViewModel
            MainViewModel = new MainViewModel();

            MainViewModel.NavigationService.RegisterWindowActions(
                showMainWindowAction: ShowMainWindow,
                showLoginWindowAction: ShowLoginWindow
            );

            // Subscribe to the RequestClose event
            MainViewModel.RequestClose += (s, args) => Shutdown();

            // Create the login window
            _loginWindow = new LoginWindow(MainViewModel);

            // Show the login window to start the application
            _loginWindow.Show();
        }

        // Method to show/hide the main window
        private void ShowMainWindow(bool show) {
            if (show) {
                // Create the main window if it doesn't exist
                if (_mainWindow == null) {
                    _mainWindow = new MainWindow(MainViewModel);
                    _mainWindow.Closed += (s, e) => {
                        _mainWindow = null;
                        MainViewModel.HandleMainWindowClosing();
                    };
                }

                // Hide login window and show main window
                _loginWindow.Hide();
                _mainWindow.Show();
            }
            else {
                // Hide the main window if it exists
                _mainWindow?.Hide();
            }
        }

        // Method to show the login window
        private void ShowLoginWindow() {
            if (_loginWindow == null) {
                _loginWindow = new LoginWindow(MainViewModel);
            }

            _loginWindow.Show();
        }
    }
}