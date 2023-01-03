using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    public interface IQuestion
    {

        public string Name { get; }

        public string Question { get; }
        public string Response { get; }

        public string ResponseTemplate { get; }

        public string ResponseHint { get; }

        public QuestionCategory QuestionCategory { get; }

        public QuestionInputType InputType { get; }

        public string[] AnswerOptions { get; }

        public bool Evaluate(String response);

    }
}
