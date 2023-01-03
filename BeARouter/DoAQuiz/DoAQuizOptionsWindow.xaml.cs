using BeAToolsLibrary;
using System;
using System.Collections.Generic;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace BeARouter.DoAQuiz
{
    /// <summary>
    /// Interaction logic for DoAQuizOptionsWindow.xaml
    /// </summary>
    public partial class DoAQuizOptionsWindow : Window
    {
        private QuizOptions quizOptions;
        private readonly DoAQuizWindow.UpdateWindowDelegate updateWindow;

        public DoAQuizOptionsWindow(QuizOptions quizOptions, DoAQuizWindow.UpdateWindowDelegate updateWindow)
        {

            InitializeComponent();
            this.quizOptions = quizOptions;
            this.updateWindow = updateWindow;
            textBoxGoal.Text = quizOptions.Goal.ToString();
            checkBoxIPv4.IsChecked = quizOptions.IPv4Questions;
            checkBoxIPv6.IsChecked = quizOptions.IPv6Questions;
        }

        private void checkBoxIP_Changed(object sender, RoutedEventArgs e)
        {
            quizOptions.IPv4Questions = checkBoxIPv4.IsChecked.Value;
            quizOptions.IPv6Questions = checkBoxIPv6.IsChecked.Value;
            updateWindow();
        }

        private void textBoxGoal_TextChanged(object sender, TextChangedEventArgs e)
        {
            try
            {
                var goal = Goal.Parse(textBoxGoal.Text);
                if (quizOptions == null) return;
                quizOptions.Goal = goal;
                updateWindow();
                textBoxGoal.Background = new SolidColorBrush(Colors.White);
            }
            catch (ArgumentException ex)
            {
                textBoxGoal.Background = new SolidColorBrush(Colors.Yellow);
            }
        }
    }
}
