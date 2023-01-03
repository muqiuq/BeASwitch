using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    public class EUI64Question : IQuestion
    {
        private string macAddr;
        private SubnetV6 randomSubnet;
        private readonly IPv6Address response;

        private List<string> answerOptions = new List<string>();

        public EUI64Question()
        {
            macAddr = Helper.GenerateRandomMAC();
            randomSubnet = Helper.GetRandomIPv6Subnet(64).GetNetSubnet();
            response = randomSubnet.GetEUI64(macAddr);
            answerOptions.Add(Response);
            var rand = new Random();
            for(int a = 0; a < 3; a++)
            {
                var randomNumber = rand.Next(a * 5, 5 * (a + 1));
                var randomHex = randomNumber.ToString("X");
                var macAddrChars = macAddr.ToCharArray();
                if (macAddrChars[1] == randomHex[0])
                {
                    randomNumber += 1;
                    randomHex = randomNumber.ToString("X");
                }
                macAddrChars[1] = randomHex[0];
                answerOptions.Add(randomSubnet.GetEUI64(new string(macAddrChars)).ToString());
            }
        }
        
        public string Name => "Unique interface ID IPv6 EUI-64";

        public string Question => $"What is the IPv6 using EUI-64 {macAddr} and {randomSubnet.ToString()}?";

        public string Response => response.ToString();

        public string ResponseHint => "";

        public string ResponseTemplate => "";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv6;

        public QuestionInputType InputType => QuestionInputType.SingleChoice;

        public string[] AnswerOptions => answerOptions.ToArray();

        public bool Evaluate(string response)
        {
            return response == Response;
        }
    }
}
