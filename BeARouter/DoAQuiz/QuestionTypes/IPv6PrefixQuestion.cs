using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    public class IPv6PrefixQuestion : IQuestion
    {
        private static string lastQuestion = null;

        public Dictionary<string, string> QuestionAndAnswers = new Dictionary<string, string>()
        {
            {"fc00::/7", "Unique local unicast" },
            {"ff00::/8", "Multicast" },
            {"fe80::/10", "Link-Scoped (Local) Unicast" },
            {"2001:DB8::/32", "Documentation (RFC 3849)" },
            {"2000::/3" , "Global unicast"},
            {"::1/128", "Loopback"},
            {"2002::/16", "6to4"},
            {"64:ff9b::/96", "IPv4-IPv6 Translat." }
        };

        private string QuestionToAnswerQuestion = "What is the purpose of the IPv6 prefix {0}?";

        private string AnswerToQuestionQuestoin = "What is the IPv6 prefix for a {0} address?";

        private List<string> answerOptions = new List<string>();

        public Dictionary<string, string> AnswersAndQuestions = new Dictionary<string, string>();
        private string randomquestion;
        private string randomanswer;
        private bool questionDirectionInverted;

        public IPv6PrefixQuestion()
        {
            if (lastQuestion != null)
            {
                QuestionAndAnswers.Remove(lastQuestion);
            }

            AnswersAndQuestions = QuestionAndAnswers.ToDictionary(x => x.Value, x => x.Key);

            var rand = new Random();

            randomquestion = QuestionAndAnswers.Keys.ElementAt(rand.Next(QuestionAndAnswers.Count));
            randomanswer = QuestionAndAnswers[randomquestion];

            lastQuestion = randomquestion;

            questionDirectionInverted = rand.Next(2) == 0 ? true : false;

            List<string> listToPickRandomAnswers = QuestionAndAnswers.Values.ToList();

            if (questionDirectionInverted)
            {
                (randomquestion, randomanswer) = (randomanswer, randomquestion);

                listToPickRandomAnswers = AnswersAndQuestions.Values.ToList();

            }
            listToPickRandomAnswers.Remove(randomanswer);

            answerOptions.Add(randomanswer);

            for (int a = 0; a < 3; a++)
            {
                var randomInCorretAnswer = listToPickRandomAnswers[rand.Next(listToPickRandomAnswers.Count)];
                answerOptions.Add(randomInCorretAnswer);
                listToPickRandomAnswers.Remove(randomInCorretAnswer);
            }
        }

        public string Name => "IPv6 Prefixes";

        public string Question
        {
            get
            {
                return string.Format(questionDirectionInverted ? AnswerToQuestionQuestoin : QuestionToAnswerQuestion, randomquestion);
            }
        }

        public string Response => randomanswer;

        public string ResponseTemplate => "";

        public string ResponseHint => "";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv6;

        public QuestionInputType InputType => QuestionInputType.SingleChoice;

        public string[] AnswerOptions => answerOptions.ToArray();

        public bool Evaluate(string response)
        {
            return response == Response;
        }
    }
}
