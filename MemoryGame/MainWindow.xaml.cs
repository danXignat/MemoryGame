using System.Windows;
using MemoryGame.ViewModels;

namespace MemoryGame {
    public partial class MainWindow : Window {
        // Constructor that takes MainViewModel
        public MainWindow(MainViewModel viewModel) {
            InitializeComponent();
            DataContext = viewModel;

            // Subscribe to the RequestClose event to handle clean closing of the application
            viewModel.RequestClose += (s, e) => Close();
        }
    }
}