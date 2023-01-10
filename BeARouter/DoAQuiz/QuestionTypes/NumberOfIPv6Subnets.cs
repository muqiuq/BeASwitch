using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    public class NumberOfIPv6Subnets : IQuestion
    {
        private SubnetV6 randomSubnet;
        private int response;
        private List<string> answerOptions = new List<string>();


        public NumberOfIPv6Subnets()
        {
            randomSubnet = Helper.GetRandomIPv6Subnet(minCidr: 48, maxCidr: 64, numberOfZeroBytes: 1).GetNetSubnet();
            response = randomSubnet.NumberOfSubnets();
            answerOptions.Add(Response);
            var rand = new Random();
            int b = 0;
            for(int a = 0; a < 3; a++)
            {
                var randomNumber = rand.Next(48, 64);
                if (randomNumber == response) randomNumber += 1;
                var numberOfSubets = (int)Math.Pow(2, 64 - randomNumber);
                if (answerOptions.Contains(numberOfSubets.ToString()) && b < 20)
                {
                    a = a - 1;
                    b++;
                    continue;
                }
                answerOptions.Add(numberOfSubets.ToString());
            }
        }

        public string Name => "Number of IPv6 subnets";

        public string Question => $"Number of possible subnets for {randomSubnet}?";

        public string Response => response.ToString();

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
