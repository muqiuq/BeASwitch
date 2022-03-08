using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace BeARouter.DoAQuiz
{
    internal class QuestionRandomizer
    {
        List<Type> QuestionTypes;

        List<IQuestion> questionQueue = new List<IQuestion>();

        public QuestionRandomizer()
        {
            var type = typeof(IQuestion);
            var types = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(s => s.GetTypes())
                .Where(p => type.IsAssignableFrom(p));

            QuestionTypes = types.Where(t => t.IsClass && t.Namespace == "BeARouter.DoAQuiz").ToList();

            foreach(var questionType in QuestionTypes)
            {
                var question = (IQuestion)Activator.CreateInstance(questionType);
                questionQueue.Add(question);
            }
        }

        public IQuestion Next()
        {
            Random random = new Random();
            var nextQuestionPos = random.Next(0, questionQueue.Count / 2);
            var nextQuestion = questionQueue[nextQuestionPos];
            questionQueue.RemoveAt(nextQuestionPos);
            questionQueue.Add((IQuestion)Activator.CreateInstance(nextQuestion.GetType()));
            return nextQuestion;
        }



    }
}
