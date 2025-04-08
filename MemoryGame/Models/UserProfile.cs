using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MemoryGame.Models {
    public class UserProfile : INotifyPropertyChanged {
        private string _username;
        private string _picturePath;

        public string Username {
            get => _username;
            set {
                if (_username != value) {
                    _username = value;
                    OnPropertyChanged();
                }
            }
        }

        public string PicturePath {
            get => _picturePath;
            set {
                if (_picturePath != value) {
                    _picturePath = value;
                    OnPropertyChanged();
                }
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null) {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}