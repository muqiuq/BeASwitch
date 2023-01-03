using System;
using System.Collections.Generic;
using System.Drawing;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace BeARouter.DoAQuiz.Frames
{
    /// <summary>
    /// Interaction logic for TextQuestionPage.xaml
    /// </summary>
    public partial class TextQuestionPage : Page, IQuestionPage
    {
        private IQuestion question;

        public TextQuestionPage(DoAQuizWindow.ActionNextDelegate actionNext)
        {
            InitializeComponent();

            ActionNext = actionNext;
        }

        public void ApplyVisualHintForAnswerCorrectness(bool isCorrect)
        {
            if(isCorrect)
            {
                textBoxAnswerInput.Background = System.Windows.Media.Brushes.LightGreen;
            }
            else
            {
                textBoxAnswerInput.Background = System.Windows.Media.Brushes.LightPink;
            }
        }

        public void Init(IQuestion question)
        {
            this.question = question;
            textBlockResponseHint.Text = question.ResponseHint;
            textBoxAnswerInput.Text = question.ResponseTemplate;
        }

        public DoAQuizWindow.ActionNextDelegate ActionNext { get; }

        public string GetAnswerInput()
        {
            return textBoxAnswerInput.Text;
        }
        
        private void textBoxAnswerInput_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                ActionNext();
            }
        }

        public void InputFocus()
        {
            if (!CheckAccess())
            {
                Dispatcher.Invoke(() => InputFocus());
                return;
            }
            textBoxAnswerInput.Focus();
        }


    }
}
