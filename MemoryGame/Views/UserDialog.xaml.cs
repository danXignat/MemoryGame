using System.Windows;

namespace MemoryGame {
    public partial class NewUserDialog : Window {
        public string Username { get; private set; }

        public NewUserDialog() {
            InitializeComponent();
            txtUsername.Focus();
        }

        private void btnOK_Click(object sender, RoutedEventArgs e) {
            if (string.IsNullOrWhiteSpace(txtUsername.Text)) {
                MessageBox.Show("Please enter a username.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            Username = txtUsername.Text.Trim();
            DialogResult = true;
        }

        private void btnCancel_Click(object sender, RoutedEventArgs e) {
            DialogResult = false;
        }
    }
}