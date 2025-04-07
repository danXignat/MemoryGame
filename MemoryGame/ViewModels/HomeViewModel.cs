using MemoryGame.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;

namespace MemoryGame.ViewModels
{
    public class HomeViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;

        public ICommand StartGameCommand { get; }

        public HomeViewModel(NavigationService navigationService) {
            _navigationService = navigationService;

            // Add command to start game directly from home screen
            StartGameCommand = new RelayCommand(p => {
                // Need to access MainViewModel's GameViewModel here
                // This is a bit of a hack - in a larger app you'd use a proper IoC container
                var mainViewModel = (MainViewModel)((NavigationService)_navigationService)
                    .GetType()
                    .GetField("_mainViewModel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                    .GetValue(_navigationService);

                _navigationService.NavigateTo(mainViewModel.GameViewModel);
            });
        }
    }
}
