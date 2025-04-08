using MemoryGame.Commands;
using MemoryGame.Models;
using MemoryGame.Services;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows.Input;

namespace MemoryGame.ViewModels {
    public class HomeViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;
        private ObservableCollection<ScoreRecord> _userScores;
        private UserProfile _currentUser;
        private bool _isUserLoggedIn;
        private bool _hasNoScores;

        public ICommand StartGameCommand { get; }

        public UserProfile CurrentUser {
            get => _currentUser;
            set {
                if (SetProperty(ref _currentUser, value)) {
                    IsUserLoggedIn = (value != null);
                    LoadUserScores();
                }
            }
        }

        public bool IsUserLoggedIn {
            get => _isUserLoggedIn;
            set => SetProperty(ref _isUserLoggedIn, value);
        }

        public bool HasNoScores {
            get => _hasNoScores;
            set => SetProperty(ref _hasNoScores, value);
        }

        public ObservableCollection<ScoreRecord> UserScores {
            get => _userScores;
            set => SetProperty(ref _userScores, value);
        }

        public HomeViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
            _userScores = new ObservableCollection<ScoreRecord>();

            StartGameCommand = new RelayCommand(
                execute: p => StartGame(),
                canExecute: p => IsUserLoggedIn
            );
        }

        public void Initialize() {
            // Get the current user from the main view model
            if (_navigationService.MainViewModel?.CurrentUser != null) {
                CurrentUser = _navigationService.MainViewModel.CurrentUser;
            }
        }

        private void StartGame() {
            _navigationService.NavigateTo(_navigationService.MainViewModel.GameViewModel);
        }

        private void LoadUserScores() {
            if (!IsUserLoggedIn) {
                UserScores.Clear();
                HasNoScores = false;
                return;
            }

            // Load the user's scores from the score service
            UserScores = new ObservableCollection<ScoreRecord>(
                ScoreService.GetScoresForUser(CurrentUser.Username)
            );

            HasNoScores = !UserScores.Any() && IsUserLoggedIn;
        }
    }
}