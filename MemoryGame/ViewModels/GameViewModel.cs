using MemoryGame.Commands;
using MemoryGame.Models;
using MemoryGame.Services;
using MemoryGame.ViewModels;
using System.Windows.Input;

namespace MemoryGame.ViewModels {
    public class GameViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;
        private UserProfile _currentUser;

        public UserProfile CurrentUser {
            get => _currentUser;
            set => SetProperty(ref _currentUser, value);
        }

        public ICommand ExitGameCommand { get; }

        public GameViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
            ExitGameCommand = new RelayCommand(ExitGame);
        }

        private void ExitGame(object parameter) {
            // Get the MainViewModel through reflection (as in your PlayGame method)
            if (_navigationService.GetType().GetField("_mainViewModel",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.GetValue(_navigationService) is MainViewModel mainViewModel) {
                mainViewModel.OnGameClosed();
            }
        }
    }
}