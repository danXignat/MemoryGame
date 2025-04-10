using System;
using System.Windows.Threading;

namespace MemoryGame.Services {
    public class TimerService {
        private readonly DispatcherTimer _timer;
        private int _remainingSeconds;
        private int _maxTimeSeconds;

        public event EventHandler<TimerEventArgs> TimerTick;
        public event EventHandler TimerExpired;

        public int RemainingSeconds => _remainingSeconds;
        public int MaxTimeSeconds {
            get => _maxTimeSeconds;
            set {
                _maxTimeSeconds = value;
                _remainingSeconds = value;
            }
        }

        public TimerService() {
            _maxTimeSeconds = 30; // Default: 30 seconds
            _remainingSeconds = _maxTimeSeconds;

            _timer = new DispatcherTimer();
            _timer.Interval = TimeSpan.FromSeconds(1);
            _timer.Tick += Timer_Tick;
        }

        private void Timer_Tick(object sender, EventArgs e) {
            if (_remainingSeconds > 0) {
                _remainingSeconds--;
                string formattedTime = FormatTime(_remainingSeconds);
                TimerTick?.Invoke(this, new TimerEventArgs(_remainingSeconds, formattedTime));
            }
            else {
                _timer.Stop();
                TimerExpired?.Invoke(this, EventArgs.Empty);
            }
        }

        public void Start() {
            _timer.Start();
        }

        public void Stop() {
            _timer.Stop();
        }

        public void Reset() {
            _remainingSeconds = _maxTimeSeconds;
            string formattedTime = FormatTime(_remainingSeconds);
            TimerTick?.Invoke(this, new TimerEventArgs(_remainingSeconds, formattedTime));
        }

        public void SetRemainingTime(int seconds) {
            _remainingSeconds = seconds;
        }

        private string FormatTime(int seconds) {
            int minutes = seconds / 60;
            int secs = seconds % 60;
            return $"{minutes:00}:{secs:00}";
        }
    }

    public class TimerEventArgs : EventArgs {
        public int RemainingSeconds { get; }
        public string FormattedTime { get; }

        public TimerEventArgs(int remainingSeconds, string formattedTime) {
            RemainingSeconds = remainingSeconds;
            FormattedTime = formattedTime;
        }
    }
}