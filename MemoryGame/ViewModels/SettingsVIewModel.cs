using MemoryGame.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MemoryGame.ViewModels
{
    public class SettingsViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;

        public SettingsViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
        }
    }
}
