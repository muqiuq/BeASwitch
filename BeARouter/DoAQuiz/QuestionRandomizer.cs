﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace BeARouter.DoAQuiz
{
    internal class QuestionRandomizer
    {
        private readonly QuizOptions quizOptions;
        List<Type> QuestionTypes;

        List<IQuestion> questionQueue = new List<IQuestion>();

        public QuestionRandomizer(QuizOptions quizOptions)
        {
            this.quizOptions = quizOptions;

            var type = typeof(IQuestion);
            var types = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(s => s.GetTypes())
                .Where(p => type.IsAssignableFrom(p));

            QuestionTypes = types.Where(t => t.IsClass && t.Namespace == "BeARouter.DoAQuiz.QuestionTypes" && t.GetInterfaces().Contains(typeof(IQuestion))).ToList();

            foreach(var questionType in QuestionTypes)
            {
                var attributes = questionType.GetCustomAttributes(false);
                int numberOfAdds = 1;
                if(attributes.Length > 0 && attributes.Any(i => i is FrequencyAttribute))
                {
                    var frequencyAttribute = (FrequencyAttribute)attributes.Where(i => i is FrequencyAttribute).First();
                    numberOfAdds = frequencyAttribute.Frequency;
                }
                for(int a = 0; a < numberOfAdds; a++)
                {
                    var question = (IQuestion)Activator.CreateInstance(questionType);
                    questionQueue.Add(question);
                }
            }
        }

        public IQuestion Next()
        {
            Random random = new Random();
            var relevantQuestions = questionQueue.Where(q => quizOptions.IsQuestionCategoryActive(q.QuestionCategory)).ToList();
            if(relevantQuestions.Count == 0)
            {
                relevantQuestions = questionQueue.ToList();
            }
            var nextQuestionPos = random.Next(0, relevantQuestions.Count / 2);
            var nextQuestion = relevantQuestions[nextQuestionPos];
            questionQueue.Remove(nextQuestion);
            questionQueue.Add((IQuestion)Activator.CreateInstance(nextQuestion.GetType()));
            return nextQuestion;
        }



    }
}
