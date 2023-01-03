using BeARouter.DoAQuiz;
using BeARouter.DoAQuiz.Frames;
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
        private IQuestionPage activeQuestionPage;
        QuizState currentState = QuizState.NEXT;

        DoAQuizOptionsWindow optionsWindow;

        QuizOptions quizOptions = new QuizOptions();

        public delegate void UpdateWindowDelegate();

        UpdateWindowDelegate UpdateWindow;

        public delegate void ActionNextDelegate();

        ActionNextDelegate ActionNext;

        QuestionRandomizer questionRandomizer;

        int totalCorrect = 0;
        int totalQuestions = 0;

        public DoAQuizWindow()
        {
            InitializeComponent();

            questionRandomizer = new QuestionRandomizer(quizOptions);

            UpdateWindow = new UpdateWindowDelegate(UpdateAll);
            ActionNext = new ActionNextDelegate(Next);


            buttonNext_Click(null, null);

            updateGoal();

            this.DataContext = this;
        }

        public void UpdateAll()
        {
            if (!CheckAccess())
            {
                Dispatcher.Invoke(() => UpdateAll());
                return;
            }
            if(quizOptions.ChangedOption)
            {
                RestartGame();
            }
            updateGoal();
            updatePointText();
        }

        private void RestartGame()
        {
            totalCorrect = 0;
            totalQuestions = 0;
            quizOptions.ResetChangeTracker();
            currentState = QuizState.NEXT;
            Next();
        }

        private void updateGoal()
        {
            labelGoal.Content = $"Goal: {quizOptions.Goal}";
        }

        public string TextBoxAnswerInputHint { get; set; } = "Input";

        public void Next()
        {
            if (!CheckAccess())
            {
                Dispatcher.Invoke(() => Next());
                return;
            }
            if (currentState == QuizState.NEXT)
            {
                activeQuestion = questionRandomizer.Next();

                activeQuestionPage = QuestionPageHelper.GetQuestionPageForQuestion(ActionNext, activeQuestion);

                frameQuestionInput.Content = activeQuestionPage;

                textBlockQuestion.Text = activeQuestion.Question;
                textBlockAnswer.Text = "";

                if(optionsWindow == null || !optionsWindow.IsVisible)
                    activeQuestionPage.InputFocus();

                updateState(currentState = QuizState.CHECK);
            }
            else if (currentState == QuizState.CHECK)
            {
                string response = activeQuestionPage.GetAnswerInput();

                if(response != null)
                {
                    response = response.Trim();
                }

                totalQuestions++;

                if (activeQuestion.Evaluate(response))
                {
                    textBlockAnswer.Text = $"Correct!";
                    activeQuestionPage.ApplyVisualHintForAnswerCorrectness(true);
                    totalCorrect++;
                }
                else
                {
                    textBlockAnswer.Text = $"Incorrect! Correct: {activeQuestion.Response}";
                    activeQuestionPage.ApplyVisualHintForAnswerCorrectness(false);
                }
                updatePointText();

                if (totalCorrect != totalQuestions)
                {
                    pointsRectangle.Fill = Brushes.LightYellow;
                }

                if (quizOptions.Goal.IsGoalReached(totalCorrect, totalQuestions))
                {
                    var successWindow = new SuccessCertificateWindow(quizOptions.Goal, $"BeAQuiz,IPv4:{quizOptions.IPv4Questions},IPv6:{quizOptions.IPv6Questions}");
                    successWindow.Show();
                }

                updateState(QuizState.NEXT);
            }
        }

        private void buttonNext_Click(object sender, RoutedEventArgs e)
        {
            Next();
        }

        private void updatePointText()
        {
            pointsText.Text = $"{totalCorrect}/{totalQuestions}";
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



        private void buttonOptions_Click(object sender, RoutedEventArgs e)
        {
            if(optionsWindow == null || !optionsWindow.IsVisible)
            {
                optionsWindow = new DoAQuizOptionsWindow(quizOptions, UpdateWindow);
                optionsWindow.Show();
            }
        }

        private void frameQuestionInput_Navigated(object sender, System.Windows.Navigation.NavigationEventArgs e)
        {
            frameQuestionInput.NavigationService.RemoveBackEntry();
        }

        private void buttonRestart_Click(object sender, RoutedEventArgs e)
        {
            var messageBox = MessageBox.Show("Are you sure you want to restart the game and loose your progress?", "Restart game", MessageBoxButton.YesNo, MessageBoxImage.Warning, MessageBoxResult.No);
            if (messageBox == MessageBoxResult.Yes)
            {
                RestartGame();
                UpdateAll();
            }
        }
    }
}
