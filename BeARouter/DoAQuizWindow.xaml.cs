using BeARouter.DoAQuiz;
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

namespace BeARouter
{
    /// <summary>
    /// Interaction logic for DoAQuiz.xaml
    /// </summary>
    public partial class DoAQuizWindow : Window
    {
        IQuestion activeQuestion;
        QuizState currentState = QuizState.NEXT;

        QuestionRandomizer questionRandomizer = new QuestionRandomizer();

        int totalCorrect = 0;
        int totalQuestions = 0;

        public DoAQuizWindow()
        {
            InitializeComponent();

            buttonNext_Click(null, null);

            this.DataContext = this;
        }

        public string TextBoxAnswerInputHint { get; set; } = "Input";

        private void buttonNext_Click(object sender, RoutedEventArgs e)
        {
            if(currentState == QuizState.NEXT)
            {
                activeQuestion = questionRandomizer.Next();

                textBoxAnswerInput.Text = "";
                textBlockResponseHint.Text = activeQuestion.ResponseHint;

                textBlockQuestion.Text = activeQuestion.Question;
                textBlockAnswer.Text = "";
                textBoxAnswerInput.Background = Brushes.White;

                updateState(currentState = QuizState.CHECK);
            }
            else if (currentState == QuizState.CHECK)
            {
                string response = textBoxAnswerInput.Text.Trim();

                totalQuestions++;

                if (activeQuestion.Evaluate(response))
                {
                    textBlockAnswer.Text = $"Correct!";
                    textBoxAnswerInput.Background = Brushes.LightGreen;
                    totalCorrect++;
                }
                else
                {
                    textBlockAnswer.Text = $"Incorrect! Correct: {activeQuestion.Response}";
                    textBoxAnswerInput.Background = Brushes.LightPink;
                }

                pointsText.Text = $"{totalCorrect}/{totalQuestions}";
                if(totalCorrect != totalQuestions)
                {
                    pointsRectangle.Fill = Brushes.LightYellow;
                }

                updateState(QuizState.NEXT);
            }
        }

        private void updateState(QuizState newState)
        {
            if(newState == QuizState.CHECK)
            {
                buttonNext.Content = "Check";
            }
            if (newState == QuizState.NEXT)
            {
                buttonNext.Content = "Next";
            }
            currentState = newState;
        }

        private void textBoxAnswerInput_KeyDown(object sender, KeyEventArgs e)
        {
            if(e.Key == Key.Enter)
            {
                buttonNext_Click(sender, null);
            }
        }
    }
}
