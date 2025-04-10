using MemoryGame.Models;
using MemoryGame.ViewModels;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace MemoryGame.Services {
    public class GameService {
        private readonly NavigationService _navigationService;
        private readonly DataService _dataService;

        public GameService(NavigationService navigationService) {
            _navigationService = navigationService;
            _dataService = new DataService();
        }

        public void SetupGameGrid(GameModel gameModel) {
            // Set grid dimensions based on difficulty
            if (gameModel.SelectedDifficulty == "Standard (4x4)") {
                gameModel.GridRows = 4;
                gameModel.GridColumns = 4;
            }
            else if (gameModel.SelectedDifficulty.StartsWith("Custom (")) {
                // Parse custom dimensions from string like "Custom (3x4)"
                try {
                    var parts = gameModel.SelectedDifficulty.Split('(')[1].Split(')')[0].Split('x');
                    if (parts.Length == 2) {
                        gameModel.GridRows = int.Parse(parts[0]);
                        gameModel.GridColumns = int.Parse(parts[1]);
                    }
                }
                catch {
                    // Fallback to standard if parsing fails
                    gameModel.GridRows = 4;
                    gameModel.GridColumns = 4;
                }
            }

            // Make sure dimensions are valid
            if (gameModel.GridRows <= 0 || gameModel.GridColumns <= 0) {
                gameModel.GridRows = 4;
                gameModel.GridColumns = 4;
            }

            // Ensure even number of cells
            if ((gameModel.GridRows * gameModel.GridColumns) % 2 != 0) {
                gameModel.GridColumns++;
            }
        }

        public bool LoadCardsForCategory(GameModel gameModel) {
            gameModel.Cards.Clear();

            // Calculate the number of pairs needed
            int pairsNeeded = (gameModel.GridRows * gameModel.GridColumns) / 2;

            try {
                // Get folder path based on selected category
                string category = gameModel.SelectedCategory.ToLower();
                string folderPath = Path.Combine(
                    AppDomain.CurrentDomain.BaseDirectory,
                    "Resources",
                    "cards",
                    category);

                // Fallback to math if folder doesn't exist
                if (!Directory.Exists(folderPath)) {
                    folderPath = Path.Combine(
                        AppDomain.CurrentDomain.BaseDirectory,
                        "Resources",
                        "cards",
                        gameModel.SelectedCategory);
                }

                if (!Directory.Exists(folderPath)) {
                    MessageBox.Show("Card images folder not found!", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    return false;
                }

                // Get all PNG files
                string[] imageFiles = Directory.GetFiles(folderPath, "*.png");

                if (imageFiles.Length < pairsNeeded) {
                    MessageBox.Show($"Not enough images found. Need {pairsNeeded} but only found {imageFiles.Length}.",
                        "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return false;
                }

                // Create pairs of cards
                for (int i = 0; i < pairsNeeded; i++) {
                    // First card in pair
                    gameModel.Cards.Add(new Card {
                        CardId = i + 1,
                        ImagePath = imageFiles[i],
                        IsFlipped = false,
                        IsMatched = false
                    });

                    // Second card in pair
                    gameModel.Cards.Add(new Card {
                        CardId = i + 1,
                        ImagePath = imageFiles[i],
                        IsFlipped = false,
                        IsMatched = false
                    });
                }

                // Shuffle the cards
                ShuffleCards(gameModel.Cards);
                return true;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error loading cards: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public void ShuffleCards(List<Card> cards) {
            Random rng = new Random();
            int n = cards.Count;

            while (n > 1) {
                n--;
                int k = rng.Next(n + 1);
                Card value = cards[k];
                cards[k] = cards[n];
                cards[n] = value;
            }
        }

        public void StartNewGame(GameModel gameModel) {
            gameModel.Cards.Clear();
            gameModel.Score = 0;
            gameModel.Attempts = 0;
            gameModel.GameTime = "00:00";
            gameModel.GameStatus = $"New game started - {gameModel.SelectedCategory} ({gameModel.SelectedDifficulty})";

            SetupGameGrid(gameModel);
            LoadCardsForCategory(gameModel);
        }

        public bool CheckMatch(Card card1, Card card2) {
            return card1 != null && card2 != null && card1.CardId == card2.CardId;
        }

        public bool IsGameComplete(List<Card> cards) {
            return cards.Count > 0 && cards.All(c => c.IsMatched);
        }

        public void SaveGame(GameModel gameModel) {
            _dataService.SaveGameState(gameModel);
        }

        public bool LoadGame(GameModel gameModel) {
            return _dataService.LoadGameState(gameModel);
        }

        public void SaveCustomSettings(List<string> customSettings) {
            _dataService.SaveCustomSettings(customSettings);
        }

        public List<string> LoadCustomSettings() {
            return _dataService.LoadCustomSettings();
        }

        public void NavigateToHome() {
            _navigationService.NavigateTo(_navigationService.MainViewModel.HomeViewModel);
        }

        public async Task<(bool IsMatch, Card FirstModelCard, Card SecondModelCard)> ProcessCardFlip(
            GameModel gameModel, Card cardToFlip, Card firstCardFlipped = null) {

            // If this is the first card being flipped
            if (firstCardFlipped == null) {
                cardToFlip.IsFlipped = true;
                return (false, null, null);
            }

            // This is the second card
            cardToFlip.IsFlipped = true;
            gameModel.Attempts++;

            // Check for match
            bool isMatch = CheckMatch(firstCardFlipped, cardToFlip);

            if (isMatch) {
                // Match found
                firstCardFlipped.IsMatched = true;
                cardToFlip.IsMatched = true;

                gameModel.Score += 10;
                gameModel.GameStatus = "Match found! +10 points";

                if (IsGameComplete(gameModel.Cards)) {
                    gameModel.GameStatus = "Congratulations! Game complete!";
                }
            }
            else {
                // No match
                gameModel.GameStatus = "No match, try again";

                // Wait before flipping back
                await Task.Delay(500);

                // Flip cards back
                firstCardFlipped.IsFlipped = false;
                cardToFlip.IsFlipped = false;
            }

            return (isMatch, firstCardFlipped, cardToFlip);
        }

        public List<CardViewModel> CreateCardViewModelsFromModel(List<Card> modelCards) {
            var cardViewModels = new List<CardViewModel>();

            foreach (var card in modelCards) {
                cardViewModels.Add(new CardViewModel {
                    CardId = card.CardId,
                    ImagePath = card.ImagePath,
                    IsFlipped = card.IsFlipped,
                    IsMatched = card.IsMatched
                });
            }

            return cardViewModels;
        }

        public Card FindModelCardForViewModel(List<Card> modelCards, CardViewModel cardViewModel) {
            foreach (var card in modelCards) {
                if (card.CardId == cardViewModel.CardId &&
                    card.ImagePath == cardViewModel.ImagePath &&
                    card.IsFlipped == cardViewModel.IsFlipped &&
                    card.IsMatched == cardViewModel.IsMatched) {
                    return card;
                }
            }

            return null;
        }
    }
}