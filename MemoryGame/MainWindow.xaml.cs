using System;
using System.Windows;
using MemoryGame.ViewModels;

namespace MemoryGame {
    public partial class MainWindow : Window {
        private readonly MainViewModel _viewModel;

        // Default parameterless constructor
        public MainWindow() {
            InitializeComponent();
        }

        // Constructor that takes MainViewModel
        public MainWindow(MainViewModel viewModel) {
            InitializeComponent();
            _viewModel = viewModel;
            DataContext = _viewModel;

            // Subscribe to events
            _viewModel.LoginRequested += OnLoginRequested;

            // Handle window closing
            this.Closing += MainWindow_Closing;
        }

        private void OnLoginRequested(object sender, EventArgs e) {
            // Close the current window when login is requested (for logout)
            this.Close();
        }

        private void MainWindow_Closing(object sender, System.ComponentModel.CancelEventArgs e) {
            // Unsubscribe from events to prevent memory leaks
            if (_viewModel != null) {
                _viewModel.LoginRequested -= OnLoginRequested;
            }
        }
    }
}