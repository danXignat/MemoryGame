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
                    if (GameViewModel != null) {
                        GameViewModel.CurrentUser = value;
                    }
                    if (HomeViewModel != null) {
                        HomeViewModel.CurrentUser = value;
                    }

                    OnPropertyChanged(nameof(WindowTitle));
                }
            }
        }

        public string WindowTitle => $"Memory Game AA - {CurrentUser?.Username ?? "Guest"}";

        // Navigation Commands
        public ICommand NavigateHomeCommand { get; }
        public ICommand NavigateGameCommand { get; }
        public ICommand NavigateScoresCommand { get; }
        public ICommand NavigateSettingsCommand { get; }
        public ICommand ShowLoginCommand { get; }
        public ICommand ExitApplicationCommand { get; }

        // View Models
        public HomeViewModel HomeViewModel { get; private set; }
        public GameViewModel GameViewModel { get; private set; }
        public ScoresViewModel ScoresViewModel { get; private set; }
        public AboutViewModel AboutViewModel { get; private set; }
        public LoginViewModel LoginViewModel { get; private set; }

        public event EventHandler RequestClose;

        public MainViewModel() {
            // Initialize navigation service
            _navigationService = new NavigationService(this);

            // Initialize view models
            HomeViewModel = new HomeViewModel(_navigationService);
            GameViewModel = new GameViewModel(_navigationService);
            ScoresViewModel = new ScoresViewModel(_navigationService);
            AboutViewModel = new AboutViewModel(_navigationService);
            LoginViewModel = new LoginViewModel(_navigationService);

            // Initialize commands
            NavigateHomeCommand = new RelayCommand(p => _navigationService.NavigateTo(HomeViewModel));
            NavigateGameCommand = new RelayCommand(p => _navigationService.NavigateTo(GameViewModel), p => CurrentUser != null);
            NavigateScoresCommand = new RelayCommand(p => _navigationService.NavigateTo(ScoresViewModel));
            NavigateSettingsCommand = new RelayCommand(p => _navigationService.NavigateTo(AboutViewModel));
            ShowLoginCommand = new RelayCommand(p => LogoutUser());
            ExitApplicationCommand = new RelayCommand(p => RequestClose?.Invoke(this, EventArgs.Empty));

            LoginViewModel.PlayRequested += (s, e) => {
                CurrentUser = LoginViewModel.SelectedUser;
                _navigationService.ShowMainWindow();

                // Navigate to HomeViewModel after login
                _navigationService.NavigateTo(HomeViewModel);
            };

            CurrentViewModel = HomeViewModel;
        }

        private void LogoutUser() {
            CurrentUser = null;
            _navigationService.HideMainWindow();
            _navigationService.ShowLoginWindow();
        }

        public void HandleMainWindowClosing() {
            _navigationService.ShowLoginWindow();
        }
    }
}