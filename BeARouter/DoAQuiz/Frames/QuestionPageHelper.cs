using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.Frames
{
    public static class QuestionPageHelper
    {

        public static IQuestionPage GetQuestionPageForQuestion(DoAQuizWindow.ActionNextDelegate actionNext, IQuestion question)
        {
            IQuestionPage questionPage = null;

            switch (question.InputType)
            {

                case QuestionInputType.Text:

                    questionPage = new TextQuestionPage(actionNext);

                    break;

                case QuestionInputType.SingleChoice:

                    questionPage = new SingleChoiceQuestionPage(actionNext);

                    break;

                default:

                    throw new NotImplementedException();

            }

            questionPage.Init(question);

            return questionPage;
        }

    }
}
