using System;
using System.Collections.Generic;
using System.Linq;
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
    /// Interaction logic for SingleChoiceQuestionPage.xaml
    /// </summary>
    public partial class SingleChoiceQuestionPage : Page, IQuestionPage
    {
        private IQuestion question;

        private List<RadioButton> radioButtons = new List<RadioButton>();

        public SingleChoiceQuestionPage(DoAQuizWindow.ActionNextDelegate actionNext)
        {
            InitializeComponent();
            ActionNext = actionNext;
        }

        public DoAQuizWindow.ActionNextDelegate ActionNext { get; }

        public void ApplyVisualHintForAnswerCorrectness(bool isCorrect)
        {
            foreach (RadioButton radioButton in radioButtons)
            {
                if((string)radioButton.Content == question.Response)
                {
                    radioButton.Background = Brushes.LightGreen;
                }
                else
                {
                    radioButton.Background = Brushes.LightPink;
                }
            }
        }

        public string GetAnswerInput()
        {
            foreach (RadioButton radioButton in radioButtons)
            {
                if (radioButton.IsChecked == true)
                {
                    return radioButton.Content.ToString();
                }
            }
            return null;
        }

        public void Init(IQuestion question)
        {
            this.question = question;
            List<string> mixedAnswerOptions = question.AnswerOptions.OrderBy(x => Guid.NewGuid()).ToList();

            for (int a = 0; a < mixedAnswerOptions.Count; a++)
            {
                var radioButton = new RadioButton()
                {
                    Content = mixedAnswerOptions[a],
                    GroupName = "answerOptions",
                    //Margin = new Thickness(0, 10 + a * 30, 0, 0),
                    Margin = new Thickness(0, 12, 0, 0),
                    FontSize = 12,
                    HorizontalAlignment = HorizontalAlignment.Stretch,
                    VerticalAlignment = VerticalAlignment.Top,
                    VerticalContentAlignment = VerticalAlignment.Top,
                    Padding = new Thickness(2,2,0,2),
                    FontFamily = new FontFamily("Courier New"),
                };
                ScaleTransform scale = new ScaleTransform(1.6, 1.6);
                radioButton.RenderTransformOrigin = new Point(0, 0);
                radioButton.RenderTransform = scale;
                radioButton.KeyDown += RadioButton_KeyDown;
                radioButtons.Add(radioButton);
                stackPanelAnswerOptions.Children.Add(radioButton);
            }
        }

        private void RadioButton_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter && sender is RadioButton)
            {
                var rb = (RadioButton)sender;
                rb.IsChecked = true;
                ActionNext();
            }
        }

        public void InputFocus()
        {
            radioButtons.First().Focus();
        }
    }
}
