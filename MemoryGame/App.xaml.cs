using System;
using System.Windows;

namespace MemoryGame {
    public partial class App : Application {
        protected override void OnStartup(StartupEventArgs e) {
            base.OnStartup(e);

            try {
                // Start with the login window instead of MainWindow
                LoginWindow loginWindow = new LoginWindow();
                loginWindow.Show();

                // REMOVE THIS LINE - it's causing the error:
                // this.StartupUri = null;
            }
            catch (Exception ex) {
                MessageBox.Show($"Error starting application: {ex.Message}\n\n{ex.StackTrace}",
                    "Critical Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}