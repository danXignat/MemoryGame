using MemoryGame.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;

namespace MemoryGame.ViewModels
{
    public class MainViewModel : ViewModelBase {
        private ViewModelBase _currentViewModel;
        private NavigationService _navigationService;

        public ViewModelBase CurrentViewModel {
            get => _currentViewModel;
            set => SetProperty(ref _currentViewModel, value);
        }

        // Navigation Commands
        public ICommand NavigateHomeCommand { get; }
        public ICommand NavigateGameCommand { get; }
        public ICommand NavigateScoresCommand { get; }
        public ICommand NavigateSettingsCommand { get; }

        // View Models
        public HomeViewModel HomeViewModel { get; private set; }
        public GameViewModel GameViewModel { get; private set; }
        public ScoresViewModel ScoresViewModel { get; private set; }
        public SettingsViewModel SettingsViewModel { get; private set; }

        public MainViewModel() {
            // Initialize navigation service
            _navigationService = new NavigationService(this);

            // Initialize view models
            HomeViewModel = new HomeViewModel(_navigationService);
            GameViewModel = new GameViewModel(_navigationService);
            ScoresViewModel = new ScoresViewModel(_navigationService);
            SettingsViewModel = new SettingsViewModel(_navigationService);

            // Set default view
            CurrentViewModel = HomeViewModel;

            // Initialize commands
            NavigateHomeCommand = new RelayCommand(p => _navigationService.NavigateTo(HomeViewModel));
            NavigateGameCommand = new RelayCommand(p => _navigationService.NavigateTo(GameViewModel));
            NavigateScoresCommand = new RelayCommand(p => _navigationService.NavigateTo(ScoresViewModel));
            NavigateSettingsCommand = new RelayCommand(p => _navigationService.NavigateTo(SettingsViewModel));
        }
    }

    public class RelayCommand : ICommand {
        private readonly Action<object> _execute;
        private readonly Predicate<object> _canExecute;

        public RelayCommand(Action<object> execute, Predicate<object> canExecute = null) {
            _execute = execute ?? throw new ArgumentNullException(nameof(execute));
            _canExecute = canExecute;
        }

        public bool CanExecute(object parameter) => _canExecute == null || _canExecute(parameter);

        public void Execute(object parameter) => _execute(parameter);

        public event EventHandler CanExecuteChanged {
            add { CommandManager.RequerySuggested += value; }
            remove { CommandManager.RequerySuggested -= value; }
        }
    }
}
