using MemoryGame.Commands;
using MemoryGame.Models;
using MemoryGame.Services;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows.Input;

namespace MemoryGame.ViewModels {
    public class GameViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;
        private UserProfile _currentUser;
        private int _score;
        private int _attempts;
        private string _gameStatus;
        private string _gameTime;
        private ObservableCollection<CardViewModel> _cards;
        private int _gridRows;
        private int _gridColumns;
        private string _selectedCategory;
        private string _selectedDifficulty;

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

        public ObservableCollection<CardViewModel> Cards {
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

        public ObservableCollection<string> GameCategories { get; }
        public ObservableCollection<string> DifficultyLevels { get; }

        public ICommand NewGameCommand { get; }
        public ICommand SaveGameCommand { get; }
        public ICommand LoadGameCommand { get; }
        public ICommand ReturnToMenuCommand { get; }
        public ICommand FlipCardCommand { get; }

        public GameViewModel(NavigationService navigationService) {
            _navigationService = navigationService;

            // Initialize collections
            Cards = new ObservableCollection<CardViewModel>();
            GameCategories = new ObservableCollection<string>
            {
                "Animals",
                "Sports",
                "Food",
                "Countries",
                "Technology"
            };
            DifficultyLevels = new ObservableCollection<string>
            {
                "Easy",
                "Medium",
                "Hard"
            };

            // Set default values
            SelectedCategory = GameCategories.First();
            SelectedDifficulty = DifficultyLevels.First();
            GameStatus = "Welcome to Memory Game";
            GameTime = "00:00";
            Score = 0;
            Attempts = 0;
            GridRows = 4;
            GridColumns = 4;

            // Initialize commands
            NewGameCommand = new RelayCommand(p => StartNewGame());
            SaveGameCommand = new RelayCommand(p => SaveGame());
            LoadGameCommand = new RelayCommand(p => LoadGame());
            ReturnToMenuCommand = new RelayCommand(p => _navigationService.NavigateTo(_navigationService.MainViewModel.HomeViewModel));
            FlipCardCommand = new RelayCommand(p => FlipCard(p as CardViewModel));

            // Load test cards
            LoadTestCards();
        }

        private void StartNewGame() {
            // Reset game state
            Score = 0;
            Attempts = 0;
            GameTime = "00:00";
            GameStatus = $"New game started - {SelectedCategory} ({SelectedDifficulty})";

            // Adjust grid size based on difficulty
            switch (SelectedDifficulty) {
                case "Easy":
                    GridRows = 4;
                    GridColumns = 4;
                    break;
                case "Medium":
                    GridRows = 5;
                    GridColumns = 4;
                    break;
                case "Hard":
                    GridRows = 6;
                    GridColumns = 5;
                    break;
            }

            // Load appropriate cards for the selected category and difficulty
            LoadCardsForCategory();
        }

        private void SaveGame() {
            GameStatus = "Game saved successfully";
        }

        private void LoadGame() {
            GameStatus = "Game loaded successfully";
        }

        private void FlipCard(CardViewModel card) {
            if (card == null || card.IsFlipped || card.IsMatched) return;

            // Flip the card
            card.IsFlipped = true;

            // Check if we have two flipped cards
            var flippedCards = Cards.Where(c => c.IsFlipped && !c.IsMatched).ToList();
            if (flippedCards.Count == 2) {
                Attempts++;

                // Check if they match
                if (flippedCards[0].CardId == flippedCards[1].CardId) {
                    // Cards match
                    flippedCards[0].IsMatched = true;
                    flippedCards[1].IsMatched = true;
                    Score += 10;
                    GameStatus = "Match found! +10 points";

                    // Check if game is complete
                    if (Cards.All(c => c.IsMatched)) {
                        GameStatus = "Congratulations! Game complete!";
                    }
                }
                else {
                    // Cards don't match - flip them back after a delay
                    GameStatus = "No match, try again";

                    // Simulate delay using a timer (in a real app)
                    // For now, just flip them back immediately
                    foreach (var c in flippedCards) {
                        c.IsFlipped = false;
                    }
                }
            }
        }

        private void LoadTestCards() {
            Cards.Clear();
            int pairs = (GridRows * GridColumns) / 2;

            for (int i = 0; i < pairs; i++) {
                var cardId = i + 1;

                // Add two cards with the same ID (a pair)
                Cards.Add(new CardViewModel {
                    CardId = cardId,
                    ImagePath = $"/Assets/Cards/{SelectedCategory.ToLower()}/{cardId}.png"
                });

                Cards.Add(new CardViewModel {
                    CardId = cardId,
                    ImagePath = $"/Assets/Cards/{SelectedCategory.ToLower()}/{cardId}.png"
                });
            }

            // Shuffle the cards
            ShuffleCards();
        }

        private void LoadCardsForCategory() {
            // This would load cards for the selected category and difficulty
            // For now, just use the test cards
            LoadTestCards();
        }

        private void ShuffleCards() {
            // Fisher-Yates shuffle algorithm
            Random rng = new Random();
            int n = Cards.Count;

            while (n > 1) {
                n--;
                int k = rng.Next(n + 1);
                CardViewModel value = Cards[k];
                Cards[k] = Cards[n];
                Cards[n] = value;
            }
        }
    }

    // Card view model
    public class CardViewModel : ViewModelBase {
        private int _cardId;
        private string _imagePath;
        private bool _isFlipped;
        private bool _isMatched;

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
    }
}