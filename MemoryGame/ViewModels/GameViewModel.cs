using MemoryGame.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MemoryGame.ViewModels
{
    public class GameViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;

        public GameViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
        }
    }
}
