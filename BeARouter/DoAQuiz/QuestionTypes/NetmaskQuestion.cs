using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    public class NetmaskQuestion : IQuestion
    {
        private Subnet ip;
        private IPv4Address net;

        public NetmaskQuestion()
        {
            ip = Helper.GetRandomIPv4Subnet();
            net = ip.GetNetSubnet().GetAddress();
        }

        public string Name => $"Netaddress of {ip.ToString()}";

        public string Question => $"Network address of {ip.ToString()}?";

        public string Response => net.ToString();

        public string ResponseHint => "X.X.X.X";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv4;

        public QuestionInputType InputType => QuestionInputType.Text;

        public string[] AnswerOptions => throw new NotImplementedException();

        public string ResponseTemplate => "";

        public bool Evaluate(string response)
        {
            return response == net.ToString();
        }
    }
}
