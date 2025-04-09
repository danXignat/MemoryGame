using System;
using System.Collections.Generic;
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
        private readonly UserManagementService _userService;
        private readonly NavigationService _navigationService;
        private ObservableCollection<UserProfile> _users;
        private UserProfile _selectedUser;
        private BitmapImage _currentUserImage;
        private int _currentPictureIndex;
        private List<string> AvailablePictures { get; }

        #region Properties

        public ObservableCollection<UserProfile> Users {
            get => _users;
            set => SetProperty(ref _users, value);
        }

        public UserProfile SelectedUser {
            get => _selectedUser;
            set {
                if (SetProperty(ref _selectedUser, value)) {
                    if (value != null) {
                        _userService.SelectUser(value.Username);
                    }

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

        #endregion

        public event EventHandler CloseRequested;
        public event EventHandler PlayRequested;

        public LoginViewModel(NavigationService navigationService = null, UserManagementService userService = null) {
            _userService = userService ?? new UserManagementService();
            _navigationService = navigationService;

            // Load resources
            AvailablePictures = _userService.GetAvailablePictures();
            LoadUsers();

            // Initialize commands
            PlayCommand = new RelayCommand(param => PlayRequested?.Invoke(this, EventArgs.Empty), param => CanPlay);
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
                _userService.UpdateUserPicture(SelectedUser.PicturePath);
                UpdatePictureDisplay();
                SaveUsers();
            }
        }

        private void PreviousPicture(object parameter) {
            if (SelectedUser != null && AvailablePictures.Count > 0) {
                _currentPictureIndex--;
                if (_currentPictureIndex < 0) _currentPictureIndex = AvailablePictures.Count - 1;

                SelectedUser.PicturePath = AvailablePictures[_currentPictureIndex];
                _userService.UpdateUserPicture(SelectedUser.PicturePath);
                UpdatePictureDisplay();
                SaveUsers();
            }
        }

        private void CreateNewUser(object parameter) {
            NewUserDialog dialog = new NewUserDialog();
            if (dialog.ShowDialog() == true) {
                string newUsername = dialog.Username;

                if (Users.Any(u => u.Username.Equals(newUsername, StringComparison.OrdinalIgnoreCase))) {
                    MessageBox.Show("A user with this name already exists.", "Error",
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                string defaultPicture = AvailablePictures.Count > 0 ? AvailablePictures[0] : string.Empty;
                UserProfile newUser = _userService.CreateUser(newUsername, defaultPicture);

                if (newUser != null) {
                    Users.Add(newUser);
                    SelectedUser = newUser;
                    SaveUsers();
                }
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
                    string username = SelectedUser.Username;

                    // First remove from local collection
                    Users.Remove(SelectedUser);

                    // Then delete from service
                    _userService.DeleteUser(username);

                    // Update the user data file
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