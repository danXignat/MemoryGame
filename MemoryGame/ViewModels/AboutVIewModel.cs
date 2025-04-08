using MemoryGame.Services;
using System;

namespace MemoryGame.ViewModels {
    public class AboutViewModel : ViewModelBase {
        private readonly NavigationService _navigationService;

        public AboutViewModel(NavigationService navigationService) {
            _navigationService = navigationService;
        }
    }
}