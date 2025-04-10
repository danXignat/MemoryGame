using MemoryGame.Commands;
using MemoryGame.Services;
using System.Collections.ObjectModel;
using System.Windows.Input;

namespace MemoryGame.ViewModels {
    public class ScoresViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;
        private readonly ScoreService _scoreService;
        private ObservableCollection<ScoreRecord> _highScores;

        public ObservableCollection<ScoreRecord> HighScores {
            get => _highScores;
            set => SetProperty(ref _highScores, value);
        }

        public ICommand BackToMenuCommand { get; }
        public ICommand ResetScoresCommand { get; }

        public ScoresViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
            _scoreService = new ScoreService();

            LoadHighScores();

            BackToMenuCommand = new RelayCommand(p => _navigationService.NavigateTo(_navigationService.MainViewModel.HomeViewModel));
            ResetScoresCommand = new RelayCommand(p => ResetScores());
        }

        private void LoadHighScores() {
            var scores = _scoreService.GetHighScores();
            HighScores = new ObservableCollection<ScoreRecord>(scores);
        }

        private void ResetScores() {
            _scoreService.ResetScores();
            LoadHighScores();
        }
    }
}