using System;
using System.Windows;
using MemoryGame.ViewModels;

namespace MemoryGame {
    public partial class LoginWindow : Window {
        // Constructor that takes a MainViewModel
        public LoginWindow(MainViewModel mainViewModel) {
            InitializeComponent();

            // Set the DataContext to the LoginViewModel from MainViewModel
            DataContext = mainViewModel.LoginViewModel;

            // Subscribe to the CloseRequested event
            mainViewModel.LoginViewModel.CloseRequested += (sender, e) => Close();
        }
    }
}