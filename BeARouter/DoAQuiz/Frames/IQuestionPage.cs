using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.Frames
{
    public interface IQuestionPage
    {

        public void ApplyVisualHintForAnswerCorrectness(bool isCorrect);

        public string GetAnswerInput();

        public void Init(IQuestion question);

        public void InputFocus();

    }
}
