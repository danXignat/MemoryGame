﻿using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace MemoryGame.Converters {
    public class StringEqualityToVisibilityConverter : IValueConverter {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture) {
            if (value == null || parameter == null)
                return Visibility.Collapsed;

            bool isEqual = value.ToString() == parameter.ToString();
            return isEqual ? Visibility.Visible : Visibility.Collapsed;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) {
            throw new NotImplementedException();
        }
    }
}