using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Imaging;
using MemoryGame.Commands;
using MemoryGame.Models;
using MemoryGame.Services;

namespace MemoryGame.ViewModels {
    public class LoginViewModel : ViewModelBase {
        private readonly UserService _userService;
        private readonly NavigationService _navigationService;
        private ObservableCollection<UserProfile> _users;
        private UserProfile _selectedUser;
        private BitmapImage _currentUserImage;
        private int _currentPictureIndex;

        #region Properties

        public ObservableCollection<UserProfile> Users {
            get => _users;
            set => SetProperty(ref _users, value);
        }

        public UserProfile SelectedUser {
            get => _selectedUser;
            set {
                if (SetProperty(ref _selectedUser, value)) {
                    UpdatePictureDisplay();
                    OnPropertyChanged(nameof(CanPlay));
                    OnPropertyChanged(nameof(CanDeleteUser));
                    OnPropertyChanged(nameof(CanChangePicture));
                }
            }
        }

        public BitmapImage CurrentUserImage {
            get => _currentUserImage;
            set => SetProperty(ref _currentUserImage, value);
        }

        public bool CanPlay => SelectedUser != null;
        public bool CanDeleteUser => SelectedUser != null;
        public bool CanChangePicture => SelectedUser != null && AvailablePictures.Count > 0;

        #endregion

        #region Commands

        public ICommand PlayCommand { get; }
        public ICommand NextPictureCommand { get; }
        public ICommand PreviousPictureCommand { get; }
        public ICommand NewUserCommand { get; }
        public ICommand DeleteUserCommand { get; }
        public ICommand CancelCommand { get; }

        private void PlayGame(object parameter) {
            if (SelectedUser != null) {
                // Just trigger close requested - let the App.xaml.cs handle showing the main window
                CloseRequested?.Invoke(this, EventArgs.Empty);
            }
        }

        #endregion

        public event EventHandler CloseRequested;

        private List<string> AvailablePictures { get; }

        public LoginViewModel(NavigationService navigationService = null, UserService userService = null) {
            _userService = userService ?? new UserService();
            _navigationService = navigationService;

            // Load resources
            AvailablePictures = _userService.GetAvailablePictures();
            LoadUsers();

            // Initialize commands
            PlayCommand = new RelayCommand(PlayGame, param => CanPlay);
            NextPictureCommand = new RelayCommand(NextPicture, param => CanChangePicture);
            PreviousPictureCommand = new RelayCommand(PreviousPicture, param => CanChangePicture);
            NewUserCommand = new RelayCommand(CreateNewUser);
            DeleteUserCommand = new RelayCommand(DeleteUser, param => CanDeleteUser);
            CancelCommand = new RelayCommand(param => CloseRequested?.Invoke(this, EventArgs.Empty));
        }

        private void LoadUsers() {
            var userList = _userService.LoadUsers();
            Users = new ObservableCollection<UserProfile>(userList);

            if (Users.Count > 0) {
                SelectedUser = Users[0];
            }
        }

        private void UpdatePictureDisplay() {
            if (SelectedUser == null || AvailablePictures.Count == 0) {
                CurrentUserImage = null;
                return;
            }

            // Set default picture if none is selected
            if (string.IsNullOrEmpty(SelectedUser.PicturePath) && AvailablePictures.Count > 0) {
                SelectedUser.PicturePath = AvailablePictures[0];
            }

            // Find current picture index
            _currentPictureIndex = AvailablePictures.IndexOf(SelectedUser.PicturePath);
            if (_currentPictureIndex < 0) _currentPictureIndex = 0;

            try {
                BitmapImage bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.UriSource = new Uri(SelectedUser.PicturePath, UriKind.Absolute);
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.EndInit();
                CurrentUserImage = bitmap;
            }
            catch (Exception) {
                // If there's an error loading the image, use the default
                if (AvailablePictures.Count > 0) {
                    SelectedUser.PicturePath = AvailablePictures[0];
                    try {
                        BitmapImage bitmap = new BitmapImage(new Uri(AvailablePictures[0], UriKind.Absolute));
                        CurrentUserImage = bitmap;
                    }
                    catch {
                        CurrentUserImage = null;
                    }
                }
            }
        }

        private void NextPicture(object parameter) {
            if (SelectedUser != null && AvailablePictures.Count > 0) {
                _currentPictureIndex++;
                if (_currentPictureIndex >= AvailablePictures.Count) _currentPictureIndex = 0;

                SelectedUser.PicturePath = AvailablePictures[_currentPictureIndex];
                UpdatePictureDisplay();
                SaveUsers();
            }
        }

        private void PreviousPicture(object parameter) {
            if (SelectedUser != null && AvailablePictures.Count > 0) {
                _currentPictureIndex--;
                if (_currentPictureIndex < 0) _currentPictureIndex = AvailablePictures.Count - 1;

                SelectedUser.PicturePath = AvailablePictures[_currentPictureIndex];
                UpdatePictureDisplay();
                SaveUsers();
            }
        }

        private void CreateNewUser(object parameter) {
            // In a real MVVM application, you would use a dialog service here
            // For simplicity, we'll keep using the dialog directly
            NewUserDialog dialog = new NewUserDialog();
            if (dialog.ShowDialog() == true) {
                string newUsername = dialog.Username;

                // Check if the username already exists
                if (Users.Any(u => u.Username.Equals(newUsername, StringComparison.OrdinalIgnoreCase))) {
                    MessageBox.Show("A user with this name already exists.", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Create new user with default picture
                UserProfile newUser = new UserProfile
                {
                    Username = newUsername,
                    PicturePath = AvailablePictures.Count > 0 ? AvailablePictures[0] : string.Empty
                };

                Users.Add(newUser);
                SelectedUser = newUser;
                SaveUsers();
            }
        }

        private void DeleteUser(object parameter) {
            if (SelectedUser != null) {
                // Confirm deletion
                MessageBoxResult result = MessageBox.Show(
                    $"Are you sure you want to delete the user '{SelectedUser.Username}'?",
                    "Confirm Deletion",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (result == MessageBoxResult.Yes) {
                    Users.Remove(SelectedUser);
                    SaveUsers();

                    // Select first user if available
                    if (Users.Count > 0) {
                        SelectedUser = Users[0];
                    }
                    else {
                        SelectedUser = null;
                    }
                }
            }
        }

        private void SaveUsers() {
            _userService.SaveUsers(Users);
        }
    }
}