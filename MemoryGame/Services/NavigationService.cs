using MemoryGame.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MemoryGame.Services
{
    public class NavigationService {
        private MainViewModel _mainViewModel;

        public NavigationService(MainViewModel mainViewModel) {
            _mainViewModel = mainViewModel;
        }

        public void NavigateTo<T>(T viewModel) where T : ViewModelBase {
            _mainViewModel.CurrentViewModel = viewModel;
        }
    }
}
