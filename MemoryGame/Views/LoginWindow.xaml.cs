using System;
using System.Windows;
using MemoryGame.ViewModels;
using MemoryGame.Services;

namespace MemoryGame {
    public partial class LoginWindow : Window {
        private readonly LoginViewModel _viewModel;
        private readonly MainViewModel _mainViewModel;

        // Add a flag to determine if application should exit
        public bool IsClosingCompletely { get; private set; } = false;

        // Default constructor for design-time
        public LoginWindow() {
            InitializeComponent();
        }

        // Constructor that takes a MainViewModel
        public LoginWindow(MainViewModel mainViewModel) {
            InitializeComponent();
            _mainViewModel = mainViewModel;

            // Use the existing LoginViewModel from the MainViewModel
            _viewModel = _mainViewModel.LoginViewModel;
            DataContext = _viewModel;

            // Handle close request from view model
            _viewModel.CloseRequested += OnCloseRequested;

            // Handle window closing
            this.Closing += LoginWindow_Closing;
        }

        private void OnCloseRequested(object sender, EventArgs e) {
            if (_viewModel.SelectedUser != null) {
                // Set the user in the main view model
                _mainViewModel.SetLoggedInUser(_viewModel.SelectedUser);

                // Set dialog result to true (success)
                this.DialogResult = true;
            }
            else {
                // Set dialog result to false (canceled)
                this.DialogResult = false;
            }

            // Close the window
            this.Close();
        }

        private void LoginWindow_Closing(object sender, System.ComponentModel.CancelEventArgs e) {
            // If window is closed by clicking the X button, set IsClosingCompletely to true
            if (!this.DialogResult.HasValue) {
                IsClosingCompletely = true;
            }
        }
    }
}