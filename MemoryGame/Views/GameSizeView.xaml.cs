using System.Windows;

namespace MemoryGame.Views {
    public partial class GameSizeView : Window {
        public int Rows { get; private set; }
        public int Columns { get; private set; }

        public GameSizeView() {
            InitializeComponent();
        }

        private void btnApply_Click(object sender, RoutedEventArgs e) {
            if (int.TryParse(txtRows.Text, out int rows) &&
                int.TryParse(txtColumns.Text, out int columns)) {

                if ((rows * columns) % 2 != 0) {
                    MessageBox.Show("Total cells (rows × columns) must be an even number.",
                                    "Invalid Input",
                                    MessageBoxButton.OK,
                                    MessageBoxImage.Warning);
                    return;
                }

                Rows = rows;
                Columns = columns;
                DialogResult = true;
            }
            else {
                MessageBox.Show("Please enter valid numbers for rows and columns.",
                                "Invalid Input",
                                MessageBoxButton.OK,
                                MessageBoxImage.Error);
            }
        }

        private void btnCancel_Click(object sender, RoutedEventArgs e) {
            DialogResult = false;
        }
    }
}