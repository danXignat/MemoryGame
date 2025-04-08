using MemoryGame.Commands;
using MemoryGame.Models;
using MemoryGame.Services;
using System;
using System.Windows.Input;

namespace MemoryGame.ViewModels {
    public class MainViewModel : ViewModelBase {
        private ViewModelBase _currentViewModel;
        private UserProfile _currentUser;
        private readonly NavigationService _navigationService;
        public NavigationService NavigationService => _navigationService;

        public ViewModelBase CurrentViewModel {
            get => _currentViewModel;
            set => SetProperty(ref _currentViewModel, value);
        }

        public UserProfile CurrentUser {
            get => _currentUser;
            set {
                if (SetProperty(ref _currentUser, value)) {
                    // Update the user in GameViewModel
                    if (GameViewModel != null) {
                        GameViewModel.CurrentUser = value;
                    }

                    OnPropertyChanged(nameof(WindowTitle));
                }
            }
        }

        public string WindowTitle => $"Memory Game - {CurrentUser?.Username ?? "Guest"}";

        // Navigation Commands
        public ICommand NavigateHomeCommand { get; }
        public ICommand NavigateGameCommand { get; }
        public ICommand NavigateScoresCommand { get; }
        public ICommand NavigateSettingsCommand { get; }
        public ICommand ShowLoginCommand { get; }
        public ICommand LogoutCommand { get; }

        // View Models
        public HomeViewModel HomeViewModel { get; private set; }
        public GameViewModel GameViewModel { get; private set; }
        public ScoresViewModel ScoresViewModel { get; private set; }
        public SettingsViewModel SettingsViewModel { get; private set; }
        public LoginViewModel LoginViewModel { get; private set; }

        public event EventHandler LoginRequested;
        public event EventHandler<UserProfile> UserLoggedIn;
        public event EventHandler GameClosed;
        public MainViewModel() {
            // Initialize navigation service
            _navigationService = new NavigationService(this);

            // Initialize view models
            HomeViewModel = new HomeViewModel(_navigationService);
            GameViewModel = new GameViewModel(_navigationService);
            ScoresViewModel = new ScoresViewModel(_navigationService);
            SettingsViewModel = new SettingsViewModel(_navigationService);
            LoginViewModel = new LoginViewModel(_navigationService);

            // Set default view
            CurrentViewModel = HomeViewModel;

            // Initialize commands
            NavigateHomeCommand = new RelayCommand(p => _navigationService.NavigateTo(HomeViewModel));
            NavigateGameCommand = new RelayCommand(p => _navigationService.NavigateTo(GameViewModel),
                p => CurrentUser != null); // Only allow game navigation if user is logged in
            NavigateScoresCommand = new RelayCommand(p => _navigationService.NavigateTo(ScoresViewModel));
            NavigateSettingsCommand = new RelayCommand(p => _navigationService.NavigateTo(SettingsViewModel));
            ShowLoginCommand = new RelayCommand(p => LoginRequested?.Invoke(this, EventArgs.Empty));
            LogoutCommand = new RelayCommand(Logout, p => CurrentUser != null);
        }

        public void SetLoggedInUser(UserProfile user) {
            CurrentUser = user;
            UserLoggedIn?.Invoke(this, user);

            // If we're on the home page, go to the game page
            if (CurrentViewModel == HomeViewModel) {
                _navigationService.NavigateTo(GameViewModel);
            }
        }
        public void OnGameClosed() {
            CurrentUser = null; // Reset the current user
            _navigationService.NavigateTo(HomeViewModel); // Navigate back to home
            GameClosed?.Invoke(this, EventArgs.Empty); // Fire the event
        }
        private void Logout(object parameter) {
            CurrentUser = null;
            // Navigate to home when logged out
            _navigationService.NavigateTo(HomeViewModel);
        }
    }
}