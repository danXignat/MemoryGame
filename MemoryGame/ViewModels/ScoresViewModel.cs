using MemoryGame.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MemoryGame.ViewModels
{
    public class ScoresViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;

        public ScoresViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
        }
    }
}
