using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace BeARouter.AppStart
{
    /// <summary>
    /// Interaction logic for SelectModePage.xaml
    /// </summary>
    public partial class SelectModePage : Page
    {
        private readonly WelcomeWindow.Next2Delegate next2Delegate;

        private bool textBoxCorrectAttemptsGood = false;
        private bool textBoxTotalAttemptsGood = false;
        private int NumberOfCorrectAttempts;
        private int NumberOfTotalAttempts;

        public SelectModePage(WelcomeWindow.Next2Delegate next2Delegate)
        {
            InitializeComponent();
            this.next2Delegate = next2Delegate;

            textBoxCorrectAttempts_TextChanged(null, null);
            textBoxTotalAttempts_TextChanged(null, null);
        }

        private void buttonStart_Click(object sender, RoutedEventArgs e)
        {
            NumberOfCorrectAttempts = 37;
            int.TryParse(textBoxCorrectAttempts.Text, out NumberOfCorrectAttempts);
            NumberOfTotalAttempts = 40;
            int.TryParse(textBoxTotalAttempts.Text, out NumberOfTotalAttempts);

            next2Delegate(radioButtonExamMode.IsChecked.Value, NumberOfCorrectAttempts, NumberOfTotalAttempts);


        }

        public void updateStartButtonState()
        {
            if (buttonStart == null) return;
            if (textBoxCorrectAttemptsGood && textBoxTotalAttemptsGood && (radioButtonExamMode.IsChecked.Value || radioButtonPraticeMode.IsChecked.Value))
            {
                buttonStart.IsEnabled = true;
            }
            else
            {
                buttonStart.IsEnabled = false;
            }
            textBoxCorrectAttempts.IsEnabled = radioButtonExamMode.IsChecked.Value;
            textBoxTotalAttempts.IsEnabled = radioButtonExamMode.IsChecked.Value;
        }

        private void textBoxCorrectAttempts_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (int.TryParse(textBoxCorrectAttempts.Text, out var numberOfCorrectAttempts) && numberOfCorrectAttempts > 0 && numberOfCorrectAttempts <= 99 && numberOfCorrectAttempts <= NumberOfTotalAttempts)
            {
                NumberOfCorrectAttempts = numberOfCorrectAttempts;
                textBoxCorrectAttemptsGood = true;
                textBoxCorrectAttempts.Background = Brushes.White;
            }
            else
            {
                textBoxCorrectAttemptsGood = false;
                textBoxCorrectAttempts.Background = Brushes.LightPink;
            }
            updateStartButtonState();
        }

        private void textBoxTotalAttempts_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (int.TryParse(textBoxTotalAttempts.Text, out var numberOfTotalAttempts) && numberOfTotalAttempts > 0 && numberOfTotalAttempts <= 99 && numberOfTotalAttempts >= NumberOfCorrectAttempts)
            {
                NumberOfTotalAttempts = numberOfTotalAttempts;
                textBoxTotalAttemptsGood = true;
                textBoxTotalAttempts.Background = Brushes.White;
            }
            else
            {
                textBoxTotalAttemptsGood = false;
                textBoxTotalAttempts.Background = Brushes.LightPink;
            }
            updateStartButtonState();
        }

        private void textBoxCorrectAttempts_KeyDown(object sender, KeyEventArgs e)
        {
            if (textBoxCorrectAttempts.Text.Length >= 3) e.Handled = true;
        }

        private void textBoxTotalAttempts_KeyDown(object sender, KeyEventArgs e)
        {
            if (textBoxTotalAttempts.Text.Length >= 3) e.Handled = true;
        }

        private void radioButtonChanged(object sender, RoutedEventArgs e)
        {
            updateStartButtonState();
        }
    }
}
