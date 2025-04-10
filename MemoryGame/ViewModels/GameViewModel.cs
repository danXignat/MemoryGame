using MemoryGame.Commands;
using MemoryGame.Models;
using MemoryGame.Services;
using MemoryGame.Views;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;

namespace MemoryGame.ViewModels {
    public class GameViewModel : ViewModelBase {
        private readonly GameService _gameService;
        private readonly GameModel _gameModel;
        private readonly UserManagementService _userService;
        private readonly TimerService _timerService;
        private readonly ScoreService _scoreService;

        private UserProfile _currentUser;
        private int _score;
        private int _attempts;
        private string _gameStatus;
        private string _gameTime;
        private ObservableCollection<CardViewModel> _cards;
        private string _selectedCategory;
        private string _selectedDifficulty;
        private int _gridRows;
        private int _gridColumns;
        private int _maxGameTime;

        private CardViewModel _firstCard = null;

        public UserProfile CurrentUser {
            get => _currentUser;
            set {
                if (SetProperty(ref _currentUser, value)) {
                    _gameModel.CurrentUser = value;
                }
            }
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

        public string SelectedCategory {
            get => _selectedCategory;
            set {
                if (SetProperty(ref _selectedCategory, value)) {
                    _gameModel.SelectedCategory = value;
                }
            }
        }

        public string SelectedDifficulty {
            get => _selectedDifficulty;
            set {
                if (SetProperty(ref _selectedDifficulty, value)) {
                    _gameModel.SelectedDifficulty = value;
                    if (value == "Custom") {
                        ShowCustomSettingDialog();
                    }
                    else if (!string.IsNullOrEmpty(value)) {
                        StartNewGame();
                    }
                }
            }
        }

        public int GridRows {
            get => _gridRows;
            set => SetProperty(ref _gridRows, value);
        }

        public int GridColumns {
            get => _gridColumns;
            set => SetProperty(ref _gridColumns, value);
        }

        public int MaxGameTime {
            get => _maxGameTime;
            set {
                if (SetProperty(ref _maxGameTime, value)) {
                    _gameModel.MaxGameTime = value;
                    _timerService.MaxTimeSeconds = value;
                }
            }
        }

        public ObservableCollection<string> GameCategories { get; }
        public ObservableCollection<string> DifficultyLevels { get; }
        public ObservableCollection<string> AvailableUsers { get; }

        public ICommand NewGameCommand { get; }
        public ICommand SaveGameCommand { get; }
        public ICommand LoadGameCommand { get; }
        public ICommand ReturnToMenuCommand { get; }
        public ICommand FlipCardCommand { get; }
        public ICommand SelectUserCommand { get; }
        public ICommand CreateUserCommand { get; }

        public GameViewModel(NavigationService navigationService) {
            _gameService = new GameService(navigationService);
            _gameModel = new GameModel();
            _userService = new UserManagementService();
            _timerService = new TimerService();
            _scoreService = new ScoreService();

            // Set up timer
            _timerService.TimerTick += TimerService_TimerTick;
            _timerService.TimerExpired += TimerService_TimerExpired;

            Cards = new ObservableCollection<CardViewModel>();
            GameCategories = new ObservableCollection<string>(_gameModel.GameCategories);
            AvailableUsers = _userService.GetAllUsernames();

            // Initialize difficulty levels with any saved custom settings
            DifficultyLevels = new ObservableCollection<string>();

            // Add standard difficulties
            DifficultyLevels.Add("Standard (4x4)");

            // Load any saved custom settings
            LoadCustomSettings();

            // Add the "Custom" option at the end
            DifficultyLevels.Add("Custom");

            Score = _gameModel.Score;
            Attempts = _gameModel.Attempts;
            GameStatus = _gameModel.GameStatus;
            GameTime = _gameModel.GameTime;
            SelectedCategory = _gameModel.SelectedCategory;
            SelectedDifficulty = _gameModel.SelectedDifficulty;
            GridRows = _gameModel.GridRows;
            GridColumns = _gameModel.GridColumns;
            MaxGameTime = _gameModel.MaxGameTime;

            NewGameCommand = new RelayCommand(p => StartNewGame());
            SaveGameCommand = new RelayCommand(p => SaveGame(), p => CurrentUser != null);
            LoadGameCommand = new RelayCommand(p => LoadGame(), p => CurrentUser != null);
            ReturnToMenuCommand = new RelayCommand(p => _gameService.NavigateToHome());
            FlipCardCommand = new RelayCommand(p => FlipCard(p as CardViewModel));
            SelectUserCommand = new RelayCommand(p => SelectUser(p as string));
            CreateUserCommand = new RelayCommand(p => CreateUser(p as string));

            // Check if there's a last logged in user
            if (AvailableUsers.Count > 0) {
                SelectUser(AvailableUsers[0]);
            }

            StartNewGame();
        }

        private void TimerService_TimerTick(object sender, TimerEventArgs e) {
            GameTime = e.FormattedTime;
            _gameModel.RemainingGameTime = e.RemainingSeconds;
        }

        private void TimerService_TimerExpired(object sender, System.EventArgs e) {
            GameStatus = "Time's up! Game over.";
            StartNewGame();
        }

        private void LoadCustomSettings() {
            var customSettings = _gameService.LoadCustomSettings();

            foreach (var setting in customSettings) {
                if (setting.StartsWith("Custom (")) {
                    DifficultyLevels.Add(setting);
                }
            }
        }

        private void ShowCustomSettingDialog() {
            GameSizeView gameSizeView = new GameSizeView();
            if (gameSizeView.ShowDialog() == true) {
                _gameModel.GridRows = gameSizeView.Rows;
                _gameModel.GridColumns = gameSizeView.Columns;

                GridRows = _gameModel.GridRows;
                GridColumns = _gameModel.GridColumns;

                string customOption = $"Custom ({_gameModel.GridRows}x{_gameModel.GridColumns})";

                bool customSizeExists = false;
                foreach (var difficulty in DifficultyLevels) {
                    if (difficulty == customOption) {
                        customSizeExists = true;
                        break;
                    }
                }

                if (!customSizeExists) {
                    int customIndex = DifficultyLevels.IndexOf("Custom");
                    if (customIndex >= 0) {
                        DifficultyLevels.Insert(customIndex, customOption);
                    }
                    else {
                        DifficultyLevels.Add(customOption);
                    }
                }

                _selectedDifficulty = null;
                SelectedDifficulty = customOption;
            }
            else {
                _selectedDifficulty = null;
                SelectedDifficulty = "Standard (4x4)";
            }
        }

        public void StartNewGame() {
            // Use game service to handle game initialization logic
            _gameService.StartNewGame(_gameModel);

            // Update view properties from model
            Score = _gameModel.Score;
            Attempts = _gameModel.Attempts;
            GameTime = _gameModel.GameTime;
            GameStatus = _gameModel.GameStatus;
            GridRows = _gameModel.GridRows;
            GridColumns = _gameModel.GridColumns;

            // Reset card selection
            _firstCard = null;

            // Reset and start timer
            _timerService.Stop();
            _timerService.Reset();
            _timerService.Start();

            // Update UI cards from model
            UpdateCardsFromModel();

            // Record that a game has been started for the current user
            if (CurrentUser != null) {
                _scoreService.RecordGameStarted(CurrentUser.Username, _selectedDifficulty);
            }
        }

        private void SaveGame() {
            if (CurrentUser == null) {
                MessageBox.Show("Please select a user before saving the game.", "User Required",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // Save current timer state
            _gameModel.RemainingGameTime = _timerService.RemainingSeconds;

            // Save both the game state and custom settings
            _gameService.SaveGame(_gameModel);
            SaveCustomSettings();
            GameStatus = $"Game saved successfully for {CurrentUser.Username}";
        }

        private void SaveCustomSettings() {
            var customSettings = new List<string>();

            foreach (var difficulty in DifficultyLevels) {
                if (difficulty.StartsWith("Custom (") && difficulty != "Custom") {
                    customSettings.Add(difficulty);
                }
            }

            _gameService.SaveCustomSettings(customSettings);
        }

        private void LoadGame() {
            if (CurrentUser == null) {
                MessageBox.Show("Please select a user before loading a game.", "User Required",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_gameService.LoadGame(_gameModel)) {
                // Update view properties from model
                Score = _gameModel.Score;
                Attempts = _gameModel.Attempts;
                GameTime = _gameModel.GameTime;
                GameStatus = $"Game loaded successfully for {CurrentUser.Username}";

                GridRows = _gameModel.GridRows;
                GridColumns = _gameModel.GridColumns;
                SelectedCategory = _gameModel.SelectedCategory;
                SelectedDifficulty = _gameModel.SelectedDifficulty;
                MaxGameTime = _gameModel.MaxGameTime;

                // Restore timer state
                _timerService.Stop();
                _timerService.MaxTimeSeconds = _gameModel.MaxGameTime;
                _timerService.SetRemainingTime(_gameModel.RemainingGameTime);
                _timerService.Start();

                UpdateCardsFromModel();
                _firstCard = null;
            }
            else {
                GameStatus = $"No saved game found for {CurrentUser.Username}";
            }
        }

        private async void FlipCard(CardViewModel cardViewModel) {
            if (cardViewModel == null || cardViewModel.IsFlipped || cardViewModel.IsMatched) {
                return;
            }

            // Find the corresponding model card
            Card modelCard = null;

            foreach (var card in _gameModel.Cards) {
                if (card.CardId == cardViewModel.CardId &&
                    card.ImagePath == cardViewModel.ImagePath &&
                    !card.IsFlipped && !card.IsMatched) {
                    modelCard = card;
                    break;
                }
            }

            if (modelCard == null) return;

            // Flip the card in the ViewModel to update UI
            cardViewModel.IsFlipped = true;

            if (_firstCard == null) {
                // First card flipped - let service handle the logic
                await _gameService.ProcessCardFlip(_gameModel, modelCard);
                _firstCard = cardViewModel;
            }
            else {
                // Find the model card for the first flipped card
                Card firstModelCard = null;
                foreach (var card in _gameModel.Cards) {
                    if (card.CardId == _firstCard.CardId && card.IsFlipped && !card.IsMatched) {
                        firstModelCard = card;
                        break;
                    }
                }

                if (firstModelCard != null) {
                    // Process the second card flip with the service
                    var result = await _gameService.ProcessCardFlip(_gameModel, modelCard, firstModelCard);

                    // Update UI based on result
                    if (result.IsMatch) {
                        // Match found - update UI
                        _firstCard.IsMatched = true;
                        cardViewModel.IsMatched = true;
                    }
                    else {
                        // No match - update UI after delay (handled by service)
                        _firstCard.IsFlipped = false;
                        cardViewModel.IsFlipped = false;
                    }

                    // Update game state in UI
                    Score = _gameModel.Score;
                    Attempts = _gameModel.Attempts;
                    GameStatus = _gameModel.GameStatus;

                    // Check if game is complete
                    if (_gameService.IsGameComplete(_gameModel.Cards)) {
                        _timerService.Stop();
                        GameStatus = "Congratulations! Game complete!";

                        // Record game completion for the current user
                        if (CurrentUser != null) {
                            _scoreService.RecordGameCompleted(CurrentUser.Username, Score);
                        }
                    }

                    // Reset first card
                    _firstCard = null;
                }
            }
        }

        private void UpdateCardsFromModel() {
            Cards.Clear();
            var viewModels = _gameService.CreateCardViewModelsFromModel(_gameModel.Cards);
            foreach (var card in viewModels) {
                Cards.Add(card);
            }
        }

        private void SelectUser(string username) {
            if (string.IsNullOrEmpty(username)) {
                return;
            }

            // Set current user
            UserProfile userProfile = _userService.SelectUser(username);
            if (userProfile != null) {
                CurrentUser = userProfile;
                GameStatus = $"User {username} selected. Welcome back!";
            }
        }

        private void CreateUser(string username) {
            if (string.IsNullOrEmpty(username)) {
                MessageBox.Show("Please enter a username", "Username Required",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // Create new user
            UserProfile newUser = _userService.CreateUser(username);
            if (newUser != null) {
                CurrentUser = newUser;

                // Add to the list if not already there
                if (!AvailableUsers.Contains(username)) {
                    AvailableUsers.Add(username);
                }

                GameStatus = $"New user {username} created successfully!";
            }
        }
    }

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