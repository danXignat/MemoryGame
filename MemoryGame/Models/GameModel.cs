using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;

namespace MemoryGame.Models {
    public class GameModel : INotifyPropertyChanged {
        private UserProfile _currentUser;
        private int _score;
        private int _attempts;
        private string _gameStatus;
        private string _gameTime;
        private List<Card> _cards;
        private int _gridRows;
        private int _gridColumns;
        private string _selectedCategory;
        private string _selectedDifficulty;
        private int _maxGameTime;
        private int _remainingGameTime;

        public event PropertyChangedEventHandler PropertyChanged;

        public UserProfile CurrentUser {
            get => _currentUser;
            set => SetProperty(ref _currentUser, value);
        }

        public int Score {
            get => _score;
            set => SetProperty(ref _score, value);
        }

        public int Attempts {
            get => _attempts;
            set => SetProperty(ref _attempts, value);
        }

        public string GameStatus {
            get => _gameStatus;
            set => SetProperty(ref _gameStatus, value);
        }

        public string GameTime {
            get => _gameTime;
            set => SetProperty(ref _gameTime, value);
        }

        public List<Card> Cards {
            get => _cards;
            set => SetProperty(ref _cards, value);
        }

        public int GridRows {
            get => _gridRows;
            set => SetProperty(ref _gridRows, value);
        }

        public int GridColumns {
            get => _gridColumns;
            set => SetProperty(ref _gridColumns, value);
        }

        public string SelectedCategory {
            get => _selectedCategory;
            set => SetProperty(ref _selectedCategory, value);
        }

        public string SelectedDifficulty {
            get => _selectedDifficulty;
            set => SetProperty(ref _selectedDifficulty, value);
        }

        public int MaxGameTime {
            get => _maxGameTime;
            set => SetProperty(ref _maxGameTime, value);
        }

        public int RemainingGameTime {
            get => _remainingGameTime;
            set => SetProperty(ref _remainingGameTime, value);
        }

        public ObservableCollection<string> GameCategories { get; set; }
        public ObservableCollection<string> DifficultyLevels { get; set; }

        public GameModel() {
            // Initialize collections
            _cards = new List<Card>();
            GameCategories = new ObservableCollection<string> {
                "Math",
                "Bible",
                "Calisthenics"
            };
            DifficultyLevels = new ObservableCollection<string> {
                "Standard (4x4)",
                "Custom"
            };
            // Set default values
            _selectedCategory = GameCategories.First();
            _selectedDifficulty = DifficultyLevels.First();
            _gameStatus = "Welcome to Memory Game";
            _gameTime = "00:00";
            _score = 0;
            _attempts = 0;
            _gridRows = 4;
            _gridColumns = 4;
            _maxGameTime = 30; // Default: 30 seconds
            _remainingGameTime = _maxGameTime;
        }

        // Helper method for property change notification
        protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string propertyName = null) {
            if (EqualityComparer<T>.Default.Equals(field, value)) return false;

            field = value;
            OnPropertyChanged(propertyName);
            return true;
        }

        // Property changed notification method
        protected void OnPropertyChanged([CallerMemberName] string propertyName = null) {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    public class Card : INotifyPropertyChanged {
        private int _cardId;
        private string _imagePath;
        private bool _isFlipped;
        private bool _isMatched;

        public event PropertyChangedEventHandler PropertyChanged;

        public int CardId {
            get => _cardId;
            set => SetProperty(ref _cardId, value);
        }

        public string ImagePath {
            get => _imagePath;
            set => SetProperty(ref _imagePath, value);
        }

        public bool IsFlipped {
            get => _isFlipped;
            set => SetProperty(ref _isFlipped, value);
        }

        public bool IsMatched {
            get => _isMatched;
            set => SetProperty(ref _isMatched, value);
        }

        // Helper method for property change notification
        protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string propertyName = null) {
            if (EqualityComparer<T>.Default.Equals(field, value)) return false;

            field = value;
            OnPropertyChanged(propertyName);
            return true;
        }

        // Property changed notification method
        protected void OnPropertyChanged([CallerMemberName] string propertyName = null) {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}