using System;
using MemoryGame.ViewModels;

namespace MemoryGame.Services {
    public class NavigationService {
        private readonly MainViewModel _mainViewModel;
        public MainViewModel MainViewModel => _mainViewModel;
        private Action<bool> _showMainWindowAction;
        private Action _showLoginWindowAction;
        public NavigationService(MainViewModel mainViewModel) {
            _mainViewModel = mainViewModel;
        }

        public void NavigateTo(ViewModelBase viewModel) {
            // Update current user in view models that need it
            if (viewModel is HomeViewModel homeViewModel) {
                homeViewModel.CurrentUser = _mainViewModel.CurrentUser;
                homeViewModel.Initialize();
            }
            else if (viewModel is GameViewModel gameViewModel) {
                gameViewModel.CurrentUser = _mainViewModel.CurrentUser;
            }

            _mainViewModel.CurrentViewModel = viewModel;
        }

        // Register actions for showing/hiding windows
        public void RegisterWindowActions(Action<bool> showMainWindowAction, Action showLoginWindowAction) {
            _showMainWindowAction = showMainWindowAction;
            _showLoginWindowAction = showLoginWindowAction;
        }

        // Show the main window with the current user
        public void ShowMainWindow() {
            _showMainWindowAction?.Invoke(true);
        }

        // Hide the main window
        public void HideMainWindow() {
            _showMainWindowAction?.Invoke(false);
        }

        // Show the login window
        public void ShowLoginWindow() {
            _showLoginWindowAction?.Invoke();
        }
    }
}